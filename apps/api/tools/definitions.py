CHECK_AVAILABILITY = {
    "type": "function",
    "function": {
        "name": "check_availability",
        "description": (
            "Check available appointment slots for a given date and service. "
            "Call this BEFORE offering any time slots to the caller. "
            "Returns a list of available time strings."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "date_description": {
                    "type": "string",
                    "description": "Natural language date e.g. 'tomorrow', 'this Saturday', 'June 15'",
                },
                "service_name": {
                    "type": "string",
                    "description": "Name of the service e.g. 'Teeth Cleaning', 'Root Canal Treatment'",
                },
            },
            "required": ["date_description"],
        },
    },
}

BOOK_APPOINTMENT = {
    "type": "function",
    "function": {
        "name": "book_appointment",
        "description": (
            "Create an appointment after ALL details are confirmed with the caller. "
            "Requires: customer name, phone, date, time, and service. "
            "Do NOT call this until the caller has confirmed all details."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name":  {"type": "string"},
                "customer_phone": {"type": "string"},
                "service":        {"type": "string"},
                "date_str": {
                    "type": "string",
                    "description": "ISO date e.g. '2026-06-26'",
                },
                "time_str": {
                    "type": "string",
                    "description": "24h time e.g. '14:00'",
                },
                "notes": {"type": "string"},
            },
            "required": ["customer_name", "customer_phone", "service", "date_str", "time_str"],
        },
    },
}

ESCALATE_TO_HUMAN = {
    "type": "function",
    "function": {
        "name": "escalate_to_human",
        "description": (
            "Transfer the call to a human agent. Call this when: "
            "(1) caller explicitly requests a human, "
            "(2) you cannot resolve the caller's issue, "
            "(3) caller is frustrated or upset."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Brief reason for escalation",
                },
            },
            "required": ["reason"],
        },
    },
}

HELIO_TOOLS = [CHECK_AVAILABILITY, BOOK_APPOINTMENT, ESCALATE_TO_HUMAN]
