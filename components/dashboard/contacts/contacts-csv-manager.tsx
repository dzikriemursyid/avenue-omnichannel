"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Download, Upload, FileText, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Contact } from "@/lib/api/contacts"
import { useCreateContact, useUpdateContact } from "@/hooks"

interface ContactGroup {
    id: string
    name: string
    color?: string
}

interface ContactsCSVManagerProps {
    contacts: Contact[]
    groups: ContactGroup[]
    groupId?: string
    onRefetch: () => void
    normalizePhoneNumber: (phone: string) => string
    validatePhoneNumber: (phone: string) => boolean
    allContacts?: Contact[] // All contacts from database for duplicate checking
}

export function ContactsCSVManager({
    contacts,
    groups,
    groupId,
    onRefetch,
    normalizePhoneNumber,
    validatePhoneNumber,
    allContacts
}: ContactsCSVManagerProps) {
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importPreview, setImportPreview] = useState<any[]>([])
    const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update' | 'duplicate'>('skip')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const createContactMutation = useCreateContact()
    const updateContactMutation = useUpdateContact()

    // CSV Export function
    const handleExport = useCallback(() => {
        const csvHeaders = ['Name', 'Phone Number']
        const csvData = [
            csvHeaders,
            ...contacts.map(contact => [
                contact.name || '',
                contact.phone_number || ''
            ])
        ]

        const csvContent = csvData.map(row =>
            row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
        ).join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `contacts_${groupId || 'all'}_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`Exported ${contacts.length} contacts`)
    }, [contacts, groupId])

    // Check for duplicate phone numbers - use allContacts if available, otherwise use contacts
    const findDuplicate = useCallback((phoneNumber: string) => {
        const contactsToSearch = allContacts || contacts
        return contactsToSearch.find(contact => contact.phone_number === phoneNumber)
    }, [allContacts, contacts])

    // CSV Import functions
    const parseCSV = useCallback((text: string) => {
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) return []

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
        const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'))
        const phoneIndex = headers.findIndex(h => h.toLowerCase().includes('phone'))

        return lines.slice(1).map((line, index) => {
            const fields = line.split(',').map(f => f.replace(/"/g, '').trim())
            const rawPhone = phoneIndex >= 0 ? fields[phoneIndex] || '' : ''
            const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone) : ''
            const duplicate = normalizedPhone ? findDuplicate(normalizedPhone) : null

            return {
                rowNumber: index + 2,
                name: nameIndex >= 0 ? fields[nameIndex] || '' : '',
                phone_number: normalizedPhone,
                original_phone: rawPhone,
                duplicate: duplicate,
                isDuplicate: !!duplicate,
                isValid: !!(fields[nameIndex] && normalizedPhone && validatePhoneNumber(normalizedPhone))
            }
        }).filter(contact => contact.name || contact.phone_number)
    }, [normalizePhoneNumber, validatePhoneNumber, findDuplicate])

    const handleImport = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }, [])

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error('Please select a CSV file')
            return
        }

        try {
            const text = await file.text()
            const parsedContacts = parseCSV(text)

            if (parsedContacts.length === 0) {
                toast.error('No contacts found in CSV file')
                return
            }

            setImportPreview(parsedContacts)
            setShowImportDialog(true)
        } catch (error) {
            toast.error('Failed to read CSV file')
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }, [parseCSV])

    const executeImport = useCallback(async () => {
        setImporting(true)
        let successCount = 0
        let errorCount = 0
        let skippedCount = 0
        let updatedCount = 0

        // Filter contacts based on duplicate action
        let contactsToProcess = importPreview.filter(contact => contact.isValid)

        if (duplicateAction === 'skip') {
            const duplicatesInValid = contactsToProcess.filter(contact => contact.isDuplicate)
            contactsToProcess = contactsToProcess.filter(contact => !contact.isDuplicate)
            skippedCount = duplicatesInValid.length
        }

        for (const contact of contactsToProcess) {
            try {
                if (contact.isDuplicate && duplicateAction === 'update') {
                    // Update existing contact - only update name and group, keep other data
                    const updateData: any = {
                        name: contact.name.trim(),
                        // Keep existing phone number - only update name and group
                    }

                    // Auto-assign group based on current context
                    if (groupId && groupId !== "all") {
                        updateData.group_id = groupId
                    }

                    await updateContactMutation.execute(contact.duplicate.id, updateData)
                    updatedCount++
                } else if (!contact.isDuplicate) {
                    // Create new contact (only if not duplicate detected client-side)
                    const contactData: any = {
                        name: contact.name.trim(),
                        phone_number: contact.phone_number,
                    }

                    // Auto-assign group based on current context
                    if (groupId && groupId !== "all") {
                        contactData.group_id = groupId
                    }

                    await createContactMutation.execute(contactData)
                    successCount++
                } else if (contact.isDuplicate && duplicateAction === 'duplicate') {
                    // For 'replace duplicates' action, completely replace the existing contact
                    const updateData: any = {
                        name: contact.name.trim(),
                        phone_number: contact.phone_number, // Replace phone number too (normalized)
                    }

                    // Auto-assign group based on current context
                    if (groupId && groupId !== "all") {
                        updateData.group_id = groupId
                    }

                    await updateContactMutation.execute(contact.duplicate.id, updateData)
                    updatedCount++
                }
            } catch (error: any) {
                // Check if it's a duplicate error
                if (error?.message?.includes('already exists') || 
                    error?.message?.includes('duplicate') ||
                    error?.message?.includes('phone number')) {
                    // This is a server-side duplicate, skip it
                    skippedCount++
                } else {
                    // Other error, increment error count
                    errorCount++
                    console.error('Import error:', error)
                }
            }
        }

        // Show appropriate success message
        const messages = []
        if (successCount > 0) messages.push(`${successCount} contacts imported`)
        if (updatedCount > 0) messages.push(`${updatedCount} contacts updated`)
        if (skippedCount > 0) messages.push(`${skippedCount} duplicates skipped`)

        if (messages.length > 0) {
            toast.success(messages.join(', '))
            onRefetch()
        }

        if (errorCount > 0) {
            toast.error(`Failed to process ${errorCount} contacts`)
        }

        setImporting(false)
        setShowImportDialog(false)
        setImportPreview([])
    }, [importPreview, duplicateAction, groupId, createContactMutation, updateContactMutation, onRefetch])

    const validContacts = importPreview.filter(c => c.isValid)
    const invalidContacts = importPreview.filter(c => !c.isValid)
    const duplicateContacts = importPreview.filter(c => c.isDuplicate && c.isValid)
    const newContacts = importPreview.filter(c => !c.isDuplicate && c.isValid)

    return (
        <>
            {/* Import Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
                className="flex items-center gap-2"
            >
                <Download className="h-4 w-4" />
                Import CSV
            </Button>

            {/* Export Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={contacts.length === 0}
                className="flex items-center gap-2"
            >
                <Upload className="h-4 w-4" />
                Export CSV
            </Button>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {/* Import Preview Dialog */}
            <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Import Contacts Preview
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Review the contacts that will be imported. Only valid contacts will be processed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-4 gap-2 p-4 bg-muted rounded-lg">
                            <div className="text-center">
                                <div className="text-xl font-bold text-green-600">{newContacts.length}</div>
                                <div className="text-xs text-muted-foreground">New Contacts</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-yellow-600">{duplicateContacts.length}</div>
                                <div className="text-xs text-muted-foreground">Duplicates</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-red-600">{invalidContacts.length}</div>
                                <div className="text-xs text-muted-foreground">Invalid</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-blue-600">{importPreview.length}</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                        </div>

                        {/* CSV Format Info */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">CSV Format Expected:</h4>
                            <div className="text-xs text-blue-800 space-y-1">
                                <div>• <strong>Name</strong>: Contact name (required)</div>
                                <div>• <strong>Phone Number</strong>: Phone number in any format (required, will be normalized to +62)</div>
                                {!allContacts && (
                                    <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800">
                                        <strong>Note:</strong> Duplicate detection limited to current view. Some duplicates from other groups may not be detected.
                                    </div>
                                )}
                                {groupId && groupId !== "all" && (
                                    <div className="mt-2 p-2 bg-blue-100 rounded">
                                        <strong>Auto-assign:</strong> All contacts will be added to "{groups.find(g => g.id === groupId)?.name}" group
                                    </div>
                                )}
                                {(!groupId || groupId === "all") && (
                                    <div className="mt-2 p-2 bg-blue-100 rounded">
                                        <strong>No Group:</strong> Contacts will be added without group assignment
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Duplicate Handling Options */}
                        {duplicateContacts.length > 0 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h4 className="font-medium text-yellow-900 mb-2">
                                    Duplicate Handling ({duplicateContacts.length} duplicates found)
                                </h4>
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            value="skip"
                                            checked={duplicateAction === 'skip'}
                                            onChange={(e) => setDuplicateAction(e.target.value as any)}
                                            className="text-yellow-600"
                                        />
                                        <span className="text-sm text-yellow-800">
                                            <strong>Skip duplicates</strong> - Only import new contacts ({newContacts.length} will be imported)
                                        </span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            value="update"
                                            checked={duplicateAction === 'update'}
                                            onChange={(e) => setDuplicateAction(e.target.value as any)}
                                            className="text-yellow-600"
                                        />
                                        <span className="text-sm text-yellow-800">
                                            <strong>Update duplicates</strong> - Update name and group of duplicate contacts, import new ones ({newContacts.length} new, {duplicateContacts.length} updated)
                                        </span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            value="duplicate"
                                            checked={duplicateAction === 'duplicate'}
                                            onChange={(e) => setDuplicateAction(e.target.value as any)}
                                            className="text-yellow-600"
                                        />
                                        <span className="text-sm text-yellow-800">
                                            <strong>Replace duplicates</strong> - Replace duplicate contacts entirely and import new ones ({validContacts.length} will be processed)
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Preview list */}
                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                            {importPreview.slice(0, 10).map((contact, index) => (
                                <div key={index} className={`p-3 border-b last:border-b-0 ${!contact.isValid ? 'bg-red-50' :
                                    contact.isDuplicate ? 'bg-yellow-50' : 'bg-green-50'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-medium">{contact.name || 'No name'}</div>
                                            <div className="text-sm text-black">
                                                {contact.original_phone} → {contact.phone_number}
                                                {contact.isDuplicate && (
                                                    <span className="ml-2 text-yellow-600">
                                                        • Duplicate of: {contact.duplicate?.name}
                                                        {contact.duplicate?.group_name && ` (${contact.duplicate.group_name})`}
                                                    </span>
                                                )}
                                                {groupId && groupId !== "all" && !contact.isDuplicate && (
                                                    <span className="ml-2">• Will be added to: {groups.find(g => g.id === groupId)?.name}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!contact.isValid ? (
                                                <div className="flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                                    <span className="text-xs text-red-600">Invalid</span>
                                                </div>
                                            ) : contact.isDuplicate ? (
                                                <span className="text-xs text-yellow-600 font-medium">Duplicate</span>
                                            ) : (
                                                <span className="text-xs text-green-600 font-medium">New</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {importPreview.length > 10 && (
                                <div className="p-3 text-center text-sm text-muted-foreground">
                                    ... and {importPreview.length - 10} more contacts
                                </div>
                            )}
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeImport}
                            disabled={importing || validContacts.length === 0}
                        >
                            {importing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Importing...
                                </>
                            ) : (
                                `Import ${duplicateAction === 'skip' ? newContacts.length : validContacts.length} Contacts`
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}