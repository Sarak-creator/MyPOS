import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/hrm/attendance - Fetch Attendance Records with filters & statistics
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    // 1. Resolve Tenant
    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({
        success: true,
        attendances: [],
        stats: { total: 0, present: 0, late: 0, leave: 0, absent: 0, rate: 0 },
      });
    }

    // 2. Check Role & Scoping
    const userRole = session?.role || "ADMIN";
    const isSuperAdminOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const isBranchManager = userRole === "BRANCH_MANAGER";

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const queryBranchId = searchParams.get("branchId");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const limit = Number(searchParams.get("limit") || 100);

    // 3. Resolve Branch Scoping
    let effectiveBranchId: string | null = null;
    let scopedBranchName: string | null = null;

    if (isBranchManager) {
      effectiveBranchId = session?.branchId || null;
      if (!effectiveBranchId && session?.userId) {
        const u = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { branchId: true },
        });
        effectiveBranchId = u?.branchId || null;
      }
    } else if (isSuperAdminOrAdmin && queryBranchId && queryBranchId !== "ALL") {
      effectiveBranchId = queryBranchId;
    }

    if (effectiveBranchId) {
      const branchInfo = await prisma.branch.findUnique({
        where: { id: effectiveBranchId },
        select: { name: true },
      });
      scopedBranchName = branchInfo?.name || null;
    }

    // 4. Build Filter
    const whereClause: any = {
      employee: {
        user: {
          tenantId,
        },
      },
    };

    if (effectiveBranchId) {
      whereClause.branchId = effectiveBranchId;
    }

    if (employeeId && employeeId !== "ALL") {
      whereClause.employeeId = employeeId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (dateParam) {
      const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const [attendances, totalEmployees] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: {
          employee: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  fullNameKh: true,
                  role: true,
                  avatarUrl: true,
                  phone: true,
                  branchId: true,
                },
              },
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { checkIn: "desc" }],
        take: limit,
      }),
      prisma.employee.count({
        where: {
          user: {
            tenantId,
            ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
          },
        },
      }),
    ]);

    const formatted = attendances.map((att) => {
      let durationHours = 0;
      let durationMinutes = 0;
      let durationFormatted = "-";

      if (att.checkIn && att.checkOut) {
        const diffMs = new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime();
        if (diffMs > 0) {
          const totalMins = Math.floor(diffMs / (1000 * 60));
          durationHours = Math.floor(totalMins / 60);
          durationMinutes = totalMins % 60;
          durationFormatted = `${durationHours}h ${durationMinutes}m`;
        }
      }

      return {
        id: att.id,
        employeeId: att.employeeId,
        employeeCode: att.employee.employeeCode,
        employeeNameKh: att.employee.user?.fullNameKh || att.employee.fullNameKh,
        employeeNameEn: att.employee.user?.fullName || att.employee.fullNameEn,
        position: att.employee.position || att.employee.user?.role || "Staff",
        phone: att.employee.phone || att.employee.user?.phone || "-",
        avatarUrl: att.employee.user?.avatarUrl || null,
        branchId: att.branchId,
        branchName: att.branch.name,
        branchCode: att.branch.code,
        date: att.date.toISOString().split("T")[0],
        checkIn: att.checkIn ? att.checkIn.toISOString() : null,
        checkOut: att.checkOut ? att.checkOut.toISOString() : null,
        durationFormatted,
        status: att.status, // PRESENT, LATE, ABSENT, LEAVE
        notes: att.notes || "",
      };
    });

    const stats = {
      total: totalEmployees,
      present: formatted.filter((a) => a.status === "PRESENT").length,
      late: formatted.filter((a) => a.status === "LATE").length,
      leave: formatted.filter((a) => a.status === "LEAVE").length,
      absent: Math.max(0, totalEmployees - formatted.filter((a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "LEAVE").length),
      rate: totalEmployees > 0 ? Math.round(((formatted.filter((a) => a.status === "PRESENT" || a.status === "LATE").length) / totalEmployees) * 100) : 0,
    };

    return NextResponse.json({
      success: true,
      attendances: formatted,
      stats,
      userRole,
      isBranchScoped: isBranchManager,
      scopedBranchId: effectiveBranchId,
      scopedBranchName,
    });
  } catch (error: any) {
    console.error("GET /api/hrm/attendance error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/hrm/attendance - Clock In, Clock Out, or Manual Entry
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { action, employeeId, branchId, checkIn, checkOut, date, status, notes } = body;

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, error: "Employee ID is required." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
    }

    const userRole = session?.role || "ADMIN";
    const isBranchManager = userRole === "BRANCH_MANAGER";

    // Determine target branch
    let targetBranchId: string | undefined = undefined;
    if (isBranchManager) {
      targetBranchId = session?.branchId || undefined;
      if (!targetBranchId && session?.userId) {
        const u = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { branchId: true },
        });
        targetBranchId = u?.branchId || undefined;
      }
    } else {
      targetBranchId = branchId || employee.user?.branchId || session?.branchId;
    }

    if (!targetBranchId) {
      const defaultBranch = await prisma.branch.findFirst({
        where: { tenantId },
      });
      targetBranchId = defaultBranch?.id;
    }

    if (!targetBranchId) {
      return NextResponse.json({ success: false, error: "Branch not found." }, { status: 400 });
    }

    const now = new Date();
    const todayDateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // 1. CLOCK IN
    if (action === "CLOCK_IN") {
      // Check if already checked in today
      const existingToday = await prisma.attendance.findFirst({
        where: {
          employeeId,
          date: todayDateOnly,
        },
      });

      if (existingToday) {
        return NextResponse.json(
          { success: false, error: "បុគ្គលិកនេះបានកត់ត្រាម៉ោងចូលរួចរាល់ហើយសម្រាប់ថ្ងៃនេះ!" },
          { status: 400 }
        );
      }

      // Auto calculate status: If after 8:30 AM local time -> LATE, else PRESENT
      const localHour = (now.getUTCHours() + 7) % 24; // Cambodia UTC+7
      const localMin = now.getUTCMinutes();
      const isLate = localHour > 8 || (localHour === 8 && localMin > 30);
      const computedStatus = status || (isLate ? "LATE" : "PRESENT");

      const attendance = await prisma.attendance.create({
        data: {
          employeeId,
          branchId: targetBranchId,
          date: todayDateOnly,
          checkIn: now,
          status: computedStatus,
          notes: notes || null,
        },
        include: { employee: true, branch: true },
      });

      return NextResponse.json({
        success: true,
        attendance,
        message: `បុគ្គលិក ${employee.fullNameKh} បានកត់ត្រាម៉ោងចូលជោគជ័យ (${computedStatus})`,
      });
    }

    // 2. CLOCK OUT
    if (action === "CLOCK_OUT") {
      const existingToday = await prisma.attendance.findFirst({
        where: {
          employeeId,
          date: todayDateOnly,
        },
        orderBy: { checkIn: "desc" },
      });

      if (!existingToday) {
        return NextResponse.json(
          { success: false, error: "មិនទាន់មានទិន្នន័យម៉ោងចូលថ្ងៃនេះទេ។ សូមកត់ត្រាម៉ោងចូលជាមុន!" },
          { status: 400 }
        );
      }

      const updated = await prisma.attendance.update({
        where: { id: existingToday.id },
        data: {
          checkOut: now,
          notes: notes ? (existingToday.notes ? `${existingToday.notes} | ${notes}` : notes) : existingToday.notes,
        },
        include: { employee: true, branch: true },
      });

      return NextResponse.json({
        success: true,
        attendance: updated,
        message: `បុគ្គលិក ${employee.fullNameKh} បានកត់ត្រាម៉ោងចេញជោគជ័យ`,
      });
    }

    // 3. MANUAL ENTRY / ADJUSTMENT
    if (action === "MANUAL_ENTRY") {
      const entryDate = date ? new Date(`${date}T00:00:00.000Z`) : todayDateOnly;
      const parsedCheckIn = checkIn ? new Date(checkIn) : new Date(`${date || now.toISOString().split("T")[0]}T08:00:00.000Z`);
      const parsedCheckOut = checkOut ? new Date(checkOut) : null;

      const record = await prisma.attendance.create({
        data: {
          employeeId,
          branchId: targetBranchId,
          date: entryDate,
          checkIn: parsedCheckIn,
          checkOut: parsedCheckOut,
          status: status || "PRESENT",
          notes: notes || null,
        },
        include: { employee: true, branch: true },
      });

      return NextResponse.json({
        success: true,
        attendance: record,
        message: "បានកត់ត្រាវត្តមានដោយជោគជ័យ",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/attendance error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/hrm/attendance - Update Attendance record
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, checkIn, checkOut, status, notes, branchId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Attendance ID is required." }, { status: 400 });
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(checkIn ? { checkIn: new Date(checkIn) } : {}),
        ...(checkOut ? { checkOut: new Date(checkOut) } : {}),
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: { employee: true, branch: true },
    });

    return NextResponse.json({
      success: true,
      attendance: updated,
      message: "កែប្រែកំណត់ត្រាវត្តមានជោគជ័យ",
    });
  } catch (error: any) {
    console.error("PATCH /api/hrm/attendance error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/hrm/attendance - Delete Attendance record
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required." }, { status: 400 });
    }

    await prisma.attendance.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "លុបកំណត់ត្រាវត្តមានជោគជ័យ",
    });
  } catch (error: any) {
    console.error("DELETE /api/hrm/attendance error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
