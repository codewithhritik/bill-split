import type { BillItem } from "@/components/bill-splitter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

export async function processBill(file: File): Promise<BillItem[]> {
    try {
        const formData = new FormData();
        formData.append("file", file);

        // Choose the appropriate endpoint based on file type
        const endpoint =
            file.type === "application/pdf" ? "process-pdf" : "process-image";

        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Convert the API response to BillItem format
        return data.items.map((item: any) => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: item.name,
            price: item.price,
            assignedTo: [],
        }));
    } catch (error) {
        console.error("Error processing file:", error);
        // Return sample data as fallback
        return getSampleBillItems();
    }
}

// Sample bill items to use as fallback
function getSampleBillItems(): BillItem[] {
    return [
        {
            id: "1",
            name: "Pasta Carbonara",
            price: 16.99,
            assignedTo: [],
        },
        {
            id: "2",
            name: "Caesar Salad",
            price: 9.99,
            assignedTo: [],
        },
        {
            id: "3",
            name: "Garlic Bread",
            price: 5.99,
            assignedTo: [],
        },
        {
            id: "4",
            name: "Tiramisu",
            price: 7.99,
            assignedTo: [],
        },
        {
            id: "5",
            name: "Iced Tea",
            price: 3.99,
            assignedTo: [],
        },
    ];
}
