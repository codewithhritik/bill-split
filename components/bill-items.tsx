"use client"

import { useState } from "react"
import type { BillItem, User } from "@/components/bill-splitter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, MoreVertical, Edit, Trash, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface BillItemsProps {
  items: BillItem[]
  users: User[]
  onAddItem: (item: BillItem) => void
  onUpdateItem: (item: BillItem) => void
  onRemoveItem: (itemId: string) => void
  onAssignItem: (itemId: string, userId: string) => void
}

export function BillItems({ items, users, onAddItem, onUpdateItem, onRemoveItem, onAssignItem }: BillItemsProps) {
  const [newItem, setNewItem] = useState<Partial<BillItem>>({
    name: "",
    price: 0,
    assignedTo: [],
  })
  const [editingItem, setEditingItem] = useState<BillItem | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleAddItem = () => {
    if (newItem.name && newItem.price !== undefined) {
      onAddItem({
        id: Date.now().toString(),
        name: newItem.name,
        price: newItem.price,
        assignedTo: [],
      })
      setNewItem({ name: "", price: 0, assignedTo: [] })
      setIsAddDialogOpen(false)
    }
  }

  const handleUpdateItem = () => {
    if (editingItem) {
      onUpdateItem(editingItem)
      setEditingItem(null)
      setIsEditDialogOpen(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getAssignedUsers = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return []
    return users.filter((user) => item.assignedTo.includes(user.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bill Items</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="item-name">Item Name</Label>
                <Input
                  id="item-name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Pasta Carbonara"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-price">Price</Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      price: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddItem}>Add Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-medium">No items yet</h3>
          <p className="text-gray-500 mt-1">Upload a bill or add items manually to get started</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{formatPrice(item.price)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getAssignedUsers(item.id).map((user) => (
                          <Badge key={user.id} variant="outline">
                            {user.name}
                          </Badge>
                        ))}
                        {item.assignedTo.length === 0 && <span className="text-gray-500 text-sm">Not assigned</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRemoveItem(item.id)} className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {users.length > 0 && items.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Assign Items to Users</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Assign to:</p>
                  <div className="flex flex-wrap gap-2">
                    {users.map((user) => {
                      const isAssigned = item.assignedTo.includes(user.id)
                      return (
                        <Button
                          key={user.id}
                          variant={isAssigned ? "default" : "outline"}
                          size="sm"
                          onClick={() => onAssignItem(item.id, user.id)}
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-xs">{getUserInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          {user.name}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {users.length === 0 && items.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
          <div className="flex items-start space-x-3">
            <UserPlus className="h-5 w-5 mt-0.5" />
            <div>
              <h4 className="font-medium">Add users to split the bill</h4>
              <p className="text-sm mt-1">Go to the Users tab to add people who will share this bill</p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-item-name">Item Name</Label>
                <Input
                  id="edit-item-name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-item-price">Price</Label>
                <Input
                  id="edit-item-price"
                  type="number"
                  step="0.01"
                  value={editingItem.price}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateItem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

