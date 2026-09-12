"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Folder, FolderPlus, FolderOpen, Loader2, PenLine, ExternalLink, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { TestFolder } from "./_types"
import { fetchTestFoldersClient } from "@/lib/supabase/tests-data"

interface Props {
  instituteId: string
  initialFolders?: TestFolder[]
  totalTestsCount?: number
}

export function FoldersDashboardClient({
  instituteId,
  initialFolders = [],
  totalTestsCount = 0,
}: Props) {
  const router = useRouter()
  const [folders, setFolders] = useState<TestFolder[]>(initialFolders)

  // Create Folder Dialog States
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isFolderCreating, setIsFolderCreating] = useState(false)

  // Create Test Dialog States
  const [isCreateTestDialogOpen, setIsCreateTestDialogOpen] = useState(false)
  const [createTestFolderId, setCreateTestFolderId] = useState<string>("none")

  // Edit Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<TestFolder | null>(null)
  const [editFolderName, setEditFolderName] = useState("")
  const [isFolderEditing, setIsFolderEditing] = useState(false)

  useEffect(() => {
    if (!instituteId || initialFolders.length > 0) return
    fetchTestFoldersClient(instituteId).then((data) => {
      const sorted = data.sort((a,b) => a.name.localeCompare(b.name))
      setFolders(sorted)
    })
  }, [instituteId, initialFolders])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setIsFolderCreating(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await (supabase as any).from('test_folders').insert({
        institute_id: instituteId,
        name: newFolderName.trim()
      }).select().single()
      
      if (error) throw error
      const newFolder = data as TestFolder
      const updated = [newFolder, ...folders].sort((a,b) => a.name.localeCompare(b.name))
      setFolders(updated)
      setIsFolderDialogOpen(false)
      setNewFolderName("")
      toast.success("Folder created successfully")
    } catch (e) {
      console.error("Failed to create folder:", e)
      toast.error("Failed to create folder")
    } finally {
      setIsFolderCreating(false)
    }
  }

  const handleEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return
    setIsFolderEditing(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await (supabase as any).from('test_folders').update({
        name: editFolderName.trim()
      }).eq('id', editingFolder.id)
      
      if (error) throw error
      
      const updated = folders.map(f => f.id === editingFolder.id ? { ...f, name: editFolderName.trim() } : f)
      updated.sort((a,b) => a.name.localeCompare(b.name))
      setFolders(updated)
      setIsEditDialogOpen(false)
      setEditingFolder(null)
      toast.success("Folder renamed successfully")
    } catch (e) {
      console.error("Failed to rename folder:", e)
      toast.error("Failed to rename folder")
    } finally {
      setIsFolderEditing(false)
    }
  }

  const openEditDialog = (folder: TestFolder) => {
    setEditingFolder(folder)
    setEditFolderName(folder.name)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:py-8 md:px-8 pb-24 sm:pb-8 max-w-full overflow-x-hidden">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Test Drives</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize and manage your assessment cohorts. {folders.length} folder{folders.length !== 1 ? 's' : ''} • {totalTestsCount} total test{totalTestsCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Button onClick={() => setIsFolderDialogOpen(true)} variant="outline" className="gap-2 shrink-0">
            <FolderPlus className="size-4" />
            <span>Create Folder</span>
          </Button>
          <Button onClick={() => setIsCreateTestDialogOpen(true)} className="gap-2 shrink-0">
            <Plus className="size-4" />
            <span>Create Test</span>
          </Button>
        </div>
      </div>

      {/* ── Mobile Floating Action Buttons ── */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden flex flex-col gap-3">
        <Button
          onClick={() => setIsFolderDialogOpen(true)}
          size="icon"
          variant="outline"
          className="size-12 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 bg-background flex items-center justify-center"
          aria-label="Create Folder"
        >
          <FolderPlus className="size-6 text-foreground" />
        </Button>
        <Button
          onClick={() => setIsCreateTestDialogOpen(true)}
          size="icon"
          className="size-12 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 bg-primary text-primary-foreground flex items-center justify-center"
          aria-label="Create Test"
        >
          <Plus className="size-6" />
        </Button>
      </div>

      {/* ── Create Test Dialog ── */}
      <Dialog open={isCreateTestDialogOpen} onOpenChange={setIsCreateTestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
            <DialogDescription>
              Select which folder to create this test in, or leave unassigned.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Test Folder</Label>
              <Select value={createTestFolderId} onValueChange={setCreateTestFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Folder (Unassigned)</SelectItem>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setIsCreateTestDialogOpen(false)
              if (createTestFolderId && createTestFolderId !== "none") {
                router.push(`/tests/new/edit?folderId=${createTestFolderId}`)
              } else {
                router.push(`/tests/new/edit`)
              }
            }}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Folder Grid Area ── */}
      <div className="space-y-4 mb-8 mt-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="size-5 text-primary" /> All Folders
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Test Drive</DialogTitle>
                <DialogDescription>
                  Organize your tests by company, cohort, or academic year.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Folder Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Amazon Drive 2026"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFolderName.trim()) {
                        handleCreateFolder()
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={isFolderCreating || !newFolderName.trim()} onClick={handleCreateFolder}>
                  {isFolderCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Folder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Folder Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Rename Folder</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Folder Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="e.g. Amazon Drive 2026"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editFolderName.trim()) {
                        handleEditFolder()
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button disabled={isFolderEditing || !editFolderName.trim()} onClick={handleEditFolder}>
                  {isFolderEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {folders.map(folder => (
            <ContextMenu key={folder.id}>
              <ContextMenuTrigger asChild>
                <button
                  onClick={() => {
                    router.push(`/tests/${encodeURIComponent(folder.name)}`)
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border bg-card hover:bg-muted/50 hover:border-border transition-all shadow-sm cursor-pointer group h-[120px]"
                >
                  <Folder className="size-8 text-primary/80 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-foreground text-center w-full px-2 line-clamp-2" title={folder.name}>
                    {folder.name}
                  </span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => router.push(`/tests/${encodeURIComponent(folder.name)}`)}>
                  <ExternalLink className="size-4 mr-2" />
                  Open Folder
                </ContextMenuItem>
                <ContextMenuItem onClick={() => openEditDialog(folder)}>
                  <PenLine className="size-4 mr-2" />
                  Rename Folder
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>
    </div>
  )
}
