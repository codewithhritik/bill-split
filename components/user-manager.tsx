"use client"

import { useState } from "react"
import type { User } from "@/components/bill-splitter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Trash, Users } from "lucide-react"

interface UserManagerProps {
  users: User[]
  onAddUser: (user: User) => void
  onRemoveUser: (userId: string) => void
}

export function UserManager({ users, onAddUser, onRemoveUser }: UserManagerProps) {
  const [newUserName, setNewUserName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAddUser = () => {
    if (newUserName.trim()) {
      onAddUser({
        id: Date.now().toString(),
        name: newUserName.trim(),
      })
      setNewUserName("")
      setIsDialogOpen(false)
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Users</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user-name">Name</Label>
                <Input
                  id="user-name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter user name"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddUser}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Users Added</CardTitle>
            <CardDescription>Add users to split the bill with</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Users className="h-16 w-16 text-gray-300" />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add First User
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveUser(user.id)}>
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium text-lg">{user.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

