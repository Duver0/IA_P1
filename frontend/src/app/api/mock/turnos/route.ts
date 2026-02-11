import { NextResponse } from "next/server";

export async function GET() {
    const data = [
        {
            id: "1",
            nombre: "Paciente Demo",
            consultorio: "101",
            timestamp: Date.now(),
        },
    ];

    return NextResponse.json(data);
}
