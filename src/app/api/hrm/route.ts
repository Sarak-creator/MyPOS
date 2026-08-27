import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/hrm - Fetch Employees, Payroll, Attendance scoped to tenant
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, employees: [], payrolls: [], attendances: [] });
    }

    const [employees, payrolls, attendances, users] = await Promise.all([
      prisma.employee.findMany({
        where: { user: { tenantId } },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              fullName: true,
              fullNameKh: true,
              phone: true,
              email: true,
            },
          },
          payrolls: { orderBy: { createdAt: "desc" }, take: 1 },
          attendances: { orderBy: { date: "desc" }, take: 5 },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payrollRecord.findMany({
        where: { employee: { user: { tenantId } } },
        include: { employee: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.attendance.findMany({
        where: { employee: { user: { tenantId } } },
        include: { employee: true },
        orderBy: { checkIn: "desc" },
        take: 30,
      }),
      prisma.user.findMany({
        where: { tenantId },
        select: { id: true, username: true, fullName: true, fullNameKh: true, role: true },
      }),
    ]);

    const formattedEmployees = employees.map((emp) => {
      const latestPayroll = emp.payrolls[0];
      const baseSalaryUsd = Number(emp.baseSalaryUsd);
      const commissionUsd = Number(latestPayroll?.commissionUsd || 0);
      const overtimeUsd = Number(latestPayroll?.overtimePayUsd || 0);
      const bonusUsd = Number(latestPayroll?.bonusUsd || 0);
      const deductionUsd = Number(latestPayroll?.deductionUsd || 0);
      const netSalaryUsd =
        Number(latestPayroll?.netSalaryUsd) || baseSalaryUsd + commissionUsd + overtimeUsd + bonusUsd - deductionUsd;

      return {
        id: emp.id,
        code: emp.employeeCode,
        userId: emp.userId,
        nameKh: emp.user?.fullNameKh || emp.user?.fullName || emp.fullNameKh,
        nameEn: emp.user?.fullName || emp.fullNameEn,
        role: emp.user?.role || emp.position,
        phone: emp.user?.phone || emp.phone,
        email: emp.user?.email || "",
        baseSalaryUsd,
        commissionUsd,
        overtimeUsd,
        bonusUsd,
        deductionUsd,
        netSalaryUsd,
        payrollStatus: latestPayroll?.isDisbursed ? "PAID" : "PENDING",
        latestAttendance: emp.attendances[0]?.status || "PRESENT",
      };
    });

    return NextResponse.json({
      success: true,
      employees: formattedEmployees,
      payrolls,
      attendances,
      users,
    });
  } catch (error: any) {
    console.error("GET /api/hrm error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/hrm - Create new Employee or Process Payroll scoped to tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { action, userId, baseSalaryUsd, employeeId, commissionUsd = 0, bonusUsd = 0, deductionUsd = 0, month } = body;

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found." }, { status: 400 });
    }

    if (action === "CREATE_EMPLOYEE") {
      if (!userId || !baseSalaryUsd) {
        return NextResponse.json(
          { success: false, error: "User ID and Base Salary are required." },
          { status: 400 }
        );
      }

      // Check if employee record already exists
      const existing = await prisma.employee.findUnique({
        where: { userId },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Employee profile already exists for this user." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
      }

      const count = await prisma.employee.count({
        where: { user: { tenantId } },
      });
      const employeeCode = `EMP-${String(count + 1).padStart(3, "0")}`;

      const newEmployee = await prisma.employee.create({
        data: {
          userId,
          employeeCode,
          fullNameKh: user.fullNameKh || user.fullName || "បុគ្គលិក",
          fullNameEn: user.fullName || "Employee",
          position: user.role || "Staff",
          phone: user.phone || "012000000",
          hireDate: new Date(),
          baseSalaryUsd: Number(baseSalaryUsd),
        },
        include: { user: true },
      });

      return NextResponse.json({
        success: true,
        employee: newEmployee,
        message: `Employee ${employeeCode} created successfully`,
      });
    }

    if (action === "PROCESS_PAYROLL") {
      if (!employeeId) {
        return NextResponse.json(
          { success: false, error: "Employee ID is required." },
          { status: 400 }
        );
      }

      const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!emp) {
        return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
      }

      const base = Number(emp.baseSalaryUsd);
      const comm = Number(commissionUsd || 0);
      const bonus = Number(bonusUsd || 0);
      const ded = Number(deductionUsd || 0);
      const net = base + comm + bonus - ded;

      const payroll = await prisma.payrollRecord.create({
        data: {
          employeeId,
          monthYear: month || new Date().toISOString().slice(0, 7),
          baseSalaryUsd: base,
          commissionUsd: comm,
          bonusUsd: bonus,
          deductionUsd: ded,
          netSalaryUsd: net,
          isDisbursed: true,
          disbursedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        payroll,
        message: "Payroll disbursed successfully",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
