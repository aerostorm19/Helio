import google.generativeai as genai

CHECK_AVAILABILITY = genai.protos.Tool(
    function_declarations=[
        genai.protos.FunctionDeclaration(
            name="check_availability",
            description=(
                "Check available appointment slots for a given date and service. "
                "Call this BEFORE offering any time slots to the caller. "
                "Returns a list of available time strings."
            ),
            parameters=genai.protos.Schema(
                type=genai.protos.Type.OBJECT,
                properties={
                    "date_description": genai.protos.Schema(
                        type=genai.protos.Type.STRING,
                        description="Natural language date e.g. 'tomorrow', 'Saturday', 'May 24'",
                    ),
                    "service_name": genai.protos.Schema(
                        type=genai.protos.Type.STRING,
                        description="Name of the service e.g. 'haircut', 'consultation'",
                    ),
                },
                required=["date_description"],
            ),
        )
    ]
)

BOOK_APPOINTMENT = genai.protos.Tool(
    function_declarations=[
        genai.protos.FunctionDeclaration(
            name="book_appointment",
            description=(
                "Create an appointment after ALL details are confirmed with the caller. "
                "Requires: customer name, phone, date, time, and service. "
                "Do NOT call this until the caller has confirmed all details."
            ),
            parameters=genai.protos.Schema(
                type=genai.protos.Type.OBJECT,
                properties={
                    "customer_name":  genai.protos.Schema(type=genai.protos.Type.STRING),
                    "customer_phone": genai.protos.Schema(type=genai.protos.Type.STRING),
                    "service":        genai.protos.Schema(type=genai.protos.Type.STRING),
                    "date_str":       genai.protos.Schema(
                        type=genai.protos.Type.STRING,
                        description="ISO date e.g. '2025-05-24'",
                    ),
                    "time_str":       genai.protos.Schema(
                        type=genai.protos.Type.STRING,
                        description="24h time e.g. '14:00'",
                    ),
                    "notes":          genai.protos.Schema(type=genai.protos.Type.STRING),
                },
                required=["customer_name", "customer_phone", "service", "date_str", "time_str"],
            ),
        )
    ]
)

ESCALATE_TO_HUMAN = genai.protos.Tool(
    function_declarations=[
        genai.protos.FunctionDeclaration(
            name="escalate_to_human",
            description=(
                "Transfer the call to a human agent. Call this when: "
                "(1) caller explicitly requests a human, "
                "(2) you cannot resolve the caller's issue, "
                "(3) caller is frustrated or upset, "
                "(4) there's a complex complaint or medical emergency."
            ),
            parameters=genai.protos.Schema(
                type=genai.protos.Type.OBJECT,
                properties={
                    "reason": genai.protos.Schema(
                        type=genai.protos.Type.STRING,
                        description="Brief reason for escalation",
                    ),
                },
                required=["reason"],
            ),
        )
    ]
)

HELIO_TOOLS = [CHECK_AVAILABILITY, BOOK_APPOINTMENT, ESCALATE_TO_HUMAN]
