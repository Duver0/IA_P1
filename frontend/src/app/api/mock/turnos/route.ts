import { NextResponse } from "next/server";

export async function GET() {
    const data = [
        {
            id: "1",
            nombre: "Paciente Demo",
            consultorio: "101",
            timestamp: Date.now(),
        },
        {
            id: "2",
            nombre: "Paciente Demo 2",
            consultorio: "102",
            timestamp: Date.now(),
        },
        {
            id: "3",
            nombre: "Paciente Demo 3",
            consultorio: "103",
            timestamp: Date.now(),
        },
    ];

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body?.nombre || !body?.cedula) {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Datos incompletos",
                    timestamp: Date.now(),
                },
                { status: 400 }
            );
        }

        // Simulación cola (RabbitMQ en futuro)
        return NextResponse.json({
            status: "queued",
            message: "Turno registrado correctamente",
            timestamp: Date.now(),
        });
    } catch {
        return NextResponse.json(
            {
                status: "error",
                message: "Error procesando solicitud",
                timestamp: Date.now(),
            },
            { status: 500 }
        );
    }
}

