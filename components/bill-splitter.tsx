"use client";

import { useState } from "react";
import { BillUploader } from "@/components/bill-uploader";
import { BillItems } from "@/components/bill-items";
import { UserManager } from "@/components/user-manager";
import { BillSummary } from "@/components/bill-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { processBill } from "@/lib/bill-processor";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";

export type BillItem = {
    id: string;
    name: string;
    price: number;
    assignedTo: string[];
};

export type User = {
    id: string;
    name: string;
};

export function BillSplitter() {
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState("upload");
    const [processingError, setProcessingError] = useState<string | null>(null);

    const handleFileUpload = async (file: File) => {
        setIsProcessing(true);
        setProcessingError(null);

        try {
            // Show appropriate toast based on file type
            if (file.type === "application/pdf") {
                toast({
                    title: "Processing PDF",
                    description:
                        "For demonstration purposes, sample data will be used for PDFs.",
                });
            } else {
                toast({
                    title: "Processing image",
                    description:
                        "Analyzing your bill image. This may take a moment.",
                });
            }

            const extractedItems = await processBill(file);

            if (extractedItems.length === 0) {
                setProcessingError(
                    "No items could be extracted from your bill. Please try a clearer image or add items manually."
                );
                // Add sample items so the user can still proceed
                setBillItems(getSampleItems());
            } else {
                setBillItems(extractedItems);

                if (file.type === "application/pdf") {
                    toast({
                        title: "PDF processed",
                        description:
                            "Sample items have been added for demonstration.",
                    });
                } else {
                    toast({
                        title: "Bill processed successfully",
                        description: `${extractedItems.length} items extracted from your bill.`,
                    });
                }
            }

            // Move to items tab
            setActiveTab("items");
        } catch (error) {
            console.error("Processing error:", error);
            setProcessingError(
                "We encountered an error processing your bill. Sample items have been added so you can continue."
            );

            // Add sample items so the user can still proceed
            setBillItems(getSampleItems());
            setActiveTab("items");

            toast({
                title: "Processing failed",
                description:
                    "We couldn't process your bill. Sample items have been added.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getSampleItems = (): BillItem[] => {
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
    };

    const handleAddUser = (user: User) => {
        setUsers([...users, user]);
    };

    const handleRemoveUser = (userId: string) => {
        setUsers(users.filter((user) => user.id !== userId));
        // Remove user assignments from bill items
        setBillItems(
            billItems.map((item) => ({
                ...item,
                assignedTo: item.assignedTo.filter((id) => id !== userId),
            }))
        );
    };

    const handleAddItem = (item: BillItem) => {
        setBillItems([...billItems, item]);
    };

    const handleUpdateItem = (updatedItem: BillItem) => {
        setBillItems(
            billItems.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
            )
        );
    };

    const handleRemoveItem = (itemId: string) => {
        setBillItems(billItems.filter((item) => item.id !== itemId));
    };

    const handleAssignItem = (itemId: string, userId: string) => {
        setBillItems(
            billItems.map((item) => {
                if (item.id === itemId) {
                    const isAssigned = item.assignedTo.includes(userId);
                    return {
                        ...item,
                        assignedTo: isAssigned
                            ? item.assignedTo.filter((id) => id !== userId)
                            : [...item.assignedTo, userId],
                    };
                }
                return item;
            })
        );
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to reset? All data will be lost.")) {
            setBillItems([]);
            setUsers([]);
            setProcessingError(null);
            setActiveTab("upload");
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <TabsList className="flex-shrink-0">
                            <TabsTrigger value="upload">
                                Upload Bill
                            </TabsTrigger>
                            <TabsTrigger
                                value="items"
                                disabled={billItems.length === 0}
                            >
                                Bill Items
                            </TabsTrigger>
                            <TabsTrigger value="users">Users</TabsTrigger>
                            <TabsTrigger
                                value="summary"
                                disabled={
                                    billItems.length === 0 || users.length === 0
                                }
                            >
                                Summary
                            </TabsTrigger>
                        </TabsList>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="w-full sm:w-auto"
                        >
                            Reset
                        </Button>
                    </div>

                    <TabsContent value="upload" className="mt-0">
                        <BillUploader
                            onUpload={handleFileUpload}
                            isProcessing={isProcessing}
                        />
                    </TabsContent>

                    <TabsContent value="items" className="mt-0">
                        {processingError && (
                            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                                <div className="flex items-start space-x-3">
                                    <AlertCircle className="h-5 w-5 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">
                                            Processing Notice
                                        </h4>
                                        <p className="text-sm mt-1">
                                            {processingError}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <BillItems
                            items={billItems}
                            users={users}
                            onAddItem={handleAddItem}
                            onUpdateItem={handleUpdateItem}
                            onRemoveItem={handleRemoveItem}
                            onAssignItem={handleAssignItem}
                        />
                    </TabsContent>

                    <TabsContent value="users" className="mt-0">
                        <UserManager
                            users={users}
                            onAddUser={handleAddUser}
                            onRemoveUser={handleRemoveUser}
                        />
                    </TabsContent>

                    <TabsContent value="summary" className="mt-0">
                        <BillSummary items={billItems} users={users} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
