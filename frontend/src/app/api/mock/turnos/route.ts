import { NextResponse } from "next/server";

export async function GET() {
    const data = [
        {
            id: "1",
            nombre: "Demo Patient",
            consultorio: "101",
            timestamp: Date.now(),
        },
        {
            id: "2",
            nombre: "Demo Patient 2",
            consultorio: "102",
            timestamp: Date.now(),
        },
        {
            id: "3",
            nombre: "Demo Patient 3",
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
                    message: "Incomplete data",
                    timestamp: Date.now(),
                },
                { status: 400 }
            );
        }

        // Mocking queue (RabbitMQ in the future)
        return NextResponse.json({
            status: "accepted",
            message: "Appointment registered successfully",
            timestamp: Date.now(),
        });
    } catch {
        return NextResponse.json(
            {
                status: "error",
                message: "Error processing request",
                timestamp: Date.now(),
            },
            { status: 500 }
        );
    }
}

