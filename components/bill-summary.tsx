"use client";

import type { BillItem, User } from "@/components/bill-splitter";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Share2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface BillSummaryProps {
    items: BillItem[];
    users: User[];
}

interface UserShare {
    userId: string;
    userName: string;
    items: {
        itemId: string;
        itemName: string;
        originalPrice: number;
        sharedPrice: number;
        sharedWith: number;
    }[];
    total: number;
}

export function BillSummary({ items, users }: BillSummaryProps) {
    // Calculate total
    const total = items.reduce((sum, item) => sum + item.price, 0);

    // Calculate each user's share
    const userShares: UserShare[] = users.map((user) => {
        const userItems = items
            .filter((item) => item.assignedTo.includes(user.id))
            .map((item) => {
                const sharedWith = item.assignedTo.length;
                const sharedPrice = item.price / sharedWith; // Calculate the user's portion
                return {
                    itemId: item.id,
                    itemName: item.name,
                    originalPrice: item.price,
                    sharedPrice: sharedPrice,
                    sharedWith,
                };
            });

        const userTotal = userItems.reduce(
            (sum, item) => sum + item.sharedPrice,
            0
        );

        return {
            userId: user.id,
            userName: user.name,
            items: userItems,
            total: userTotal,
        };
    });

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(price);
    };

    const getUserInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    const handleShareBill = () => {
        // Create a detailed summary text to share
        let summaryText = "🧾 Bill Summary\n\n";

        // Add bill total
        summaryText += `💰 Total Bill Amount: ${formatPrice(total)}\n\n`;

        // Add items overview
        summaryText += "📋 Items Overview:\n";
        items.forEach((item) => {
            summaryText += `• ${item.name}: ${formatPrice(item.price)}`;
            if (item.assignedTo.length > 0) {
                summaryText += ` (Split ${
                    item.assignedTo.length
                } ways - ${formatPrice(
                    item.price / item.assignedTo.length
                )} each)`;
            }
            summaryText += "\n";
        });

        // Add individual shares
        summaryText += "\n👥 Individual Shares:\n";
        userShares.forEach((share) => {
            summaryText += `\n${share.userName}'s Items:\n`;
            share.items.forEach((item) => {
                summaryText += `• ${item.itemName}: ${formatPrice(
                    item.sharedPrice
                )}`;
                if (item.sharedWith > 1) {
                    summaryText += ` (Split ${
                        item.sharedWith
                    } ways, full price: ${formatPrice(item.originalPrice)})`;
                }
                summaryText += "\n";
            });
            summaryText += `Total for ${share.userName}: ${formatPrice(
                share.total
            )}\n`;
        });

        // Share the summary
        if (navigator.share) {
            navigator
                .share({
                    title: "Bill Split Summary",
                    text: summaryText,
                })
                .catch((error) => {
                    console.log("Error sharing:", error);
                    // Fallback to clipboard if sharing fails
                    copyToClipboard(summaryText);
                });
        } else {
            // Fallback for browsers that don't support the Web Share API
            copyToClipboard(summaryText);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                toast({
                    title: "Copied to clipboard!",
                    description:
                        "Bill summary has been copied to your clipboard.",
                });
            })
            .catch((error) => {
                console.log("Error copying to clipboard:", error);
                toast({
                    title: "Failed to copy",
                    description:
                        "Could not copy the bill summary to clipboard.",
                    variant: "destructive",
                });
            });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Bill Summary</h2>
                <Button onClick={handleShareBill}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Bill Total</CardTitle>
                        <CardDescription>
                            Summary of the full bill
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="font-semibold">Total:</span>
                            <span className="font-semibold">
                                {formatPrice(total)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Items Overview</CardTitle>
                        <CardDescription>All items on the bill</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px] pr-4">
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between"
                                    >
                                        <div>
                                            <span className="font-medium">
                                                {item.name}
                                            </span>
                                            <div className="text-xs text-gray-500">
                                                {item.assignedTo.length > 0
                                                    ? `Split between ${
                                                          item.assignedTo.length
                                                      } users (${formatPrice(
                                                          item.price /
                                                              item.assignedTo
                                                                  .length
                                                      )} each)`
                                                    : "Not assigned"}
                                            </div>
                                        </div>
                                        <span>{formatPrice(item.price)}</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <h3 className="text-lg font-medium mt-6">Individual Shares</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userShares.map((share) => (
                    <Card key={share.userId}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center space-x-3">
                                <Avatar>
                                    <AvatarFallback>
                                        {getUserInitials(share.userName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg">
                                        {share.userName}
                                    </CardTitle>
                                    <CardDescription>
                                        {share.items.length} items
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <ScrollArea className="h-[120px] pr-4">
                                <div className="space-y-2">
                                    {share.items.map((item) => (
                                        <div
                                            key={item.itemId}
                                            className="flex justify-between text-sm"
                                        >
                                            <div>
                                                <span>{item.itemName}</span>
                                                {item.sharedWith > 1 && (
                                                    <span className="text-xs text-gray-500 ml-1">
                                                        (split {item.sharedWith}{" "}
                                                        ways)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span>
                                                    {formatPrice(
                                                        item.sharedPrice
                                                    )}
                                                </span>
                                                {item.sharedWith > 1 && (
                                                    <div className="text-xs text-gray-500">
                                                        of{" "}
                                                        {formatPrice(
                                                            item.originalPrice
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex-col items-start pt-0">
                            <Separator className="mb-2" />
                            <div className="w-full">
                                <div className="flex justify-between font-medium">
                                    <span>Total:</span>
                                    <span>{formatPrice(share.total)}</span>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
