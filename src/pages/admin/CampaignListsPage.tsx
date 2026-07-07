import { useEffect, useMemo, useState } from 'react'
import { adminKarkunProfilePath } from '@/constants/routes'
import { ContactActionBar } from '@/components/common/ContactActionBar'
import { Modal } from '@/components/common/Modal'
import { MessageComposerModal } from '@/components/communication/MessageComposerModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useCommunication } from '@/hooks/useCommunication'
import { getAllKarkuns } from '@/lib/peopleStore'
import {
  DYNAMIC_CAMPAIGN_LISTS,
  getDynamicListCounts,
  getDynamicListMembers,
} from '@/lib/dynamicCampaignLists'
import {
  createBroadcastList,
  deleteBroadcastList,
  getBroadcastLists,
  renameBroadcastList,
  setBroadcastListMembers,
  subscribeToBroadcastLists,
  type BroadcastList,
} from '@/stores/broadcastListStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { MessageRecipient } from '@/types/communication'

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

function toRecipient(karkun: KarkunRegistryRecord): MessageRecipient {
  return {
    personId: karkun.id,
    personKind: 'karkun',
    name: karkun.name,
    mobile: karkun.mobile,
    whatsapp: karkun.whatsapp,
  }
}

function MemberList({ members }: { members: KarkunRegistryRecord[] }) {
  if (members.length === 0) {
    return <p className="mt-3 text-sm text-secondary">No members in this list yet.</p>
  }
  return (
    <ul className="mt-3 space-y-3">
      {members.map((karkun) => (
        <li
          key={karkun.id}
          className="rounded-lg border border-border bg-surface-muted p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-text-heading">{karkun.name}</p>
              <p className="text-xs text-secondary">
                {karkun.area || karkun.place}
                {karkun.mobile ? ` · ${karkun.mobile}` : ''}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <ContactActionBar
              name={karkun.name}
              mobile={karkun.mobile}
              whatsapp={karkun.whatsapp}
              viewDetailsHref={adminKarkunProfilePath(karkun.id)}
              size="sm"
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function DynamicListsTab({
  onBroadcast,
}: {
  onBroadcast: (recipients: MessageRecipient[], title: string) => void
}) {
  const counts = useMemo(() => getDynamicListCounts(), [])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Intelligent lists generated automatically from live campaign data.
      </p>
      {DYNAMIC_CAMPAIGN_LISTS.map((definition) => {
        const count = counts[definition.id] ?? 0
        const expanded = expandedId === definition.id
        const members = expanded ? getDynamicListMembers(definition.id) : []
        return (
          <article
            key={definition.id}
            className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-heading">{definition.name}</h3>
                <p className="mt-1 text-sm text-secondary">{definition.description}</p>
              </div>
              <span className="rounded-full bg-primary-muted px-3 py-1 text-sm font-semibold text-primary">
                {count}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <SecondaryButton
                type="button"
                onClick={() => setExpandedId(expanded ? null : definition.id)}
              >
                👁 {expanded ? 'Hide Members' : 'View Members'}
              </SecondaryButton>
              <SecondaryButton
                type="button"
                disabled={count === 0}
                onClick={() =>
                  onBroadcast(
                    getDynamicListMembers(definition.id).map(toRecipient),
                    definition.name,
                  )
                }
              >
                🟢 Broadcast
              </SecondaryButton>
            </div>
            {expanded && <MemberList members={members} />}
          </article>
        )
      })}
    </div>
  )
}

function ManageMembersModal({
  list,
  onClose,
}: {
  list: BroadcastList
  onClose: () => void
}) {
  const allKarkuns = useMemo(() => getAllKarkuns(), [])
  const [selected, setSelected] = useState<Set<string>>(new Set(list.memberIds))
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return allKarkuns
    return allKarkuns.filter((karkun) =>
      [karkun.name, karkun.mobile, karkun.area, karkun.place, karkun.id]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [allKarkuns, query])

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = () => {
    setBroadcastListMembers(list.id, [...selected])
    onClose()
  }

  return (
    <Modal isOpen title={`Manage Members — ${list.name}`} onClose={onClose}>
      <div className="space-y-4">
        <input
          type="search"
          className={inputClassName}
          placeholder="Search Karkuns by name, mobile, place, or ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="text-sm text-secondary">{selected.size} selected</p>
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {filtered.slice(0, 100).map((karkun) => (
            <li key={karkun.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(karkun.id)}
                  onChange={() => toggle(karkun.id)}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-text-heading">
                  {karkun.name}
                  <span className="text-secondary"> · {karkun.area || karkun.place}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave}>
            Save Members
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}

function BroadcastListsTab({
  onBroadcast,
}: {
  onBroadcast: (recipients: MessageRecipient[], title: string) => void
}) {
  const [lists, setLists] = useState<BroadcastList[]>(() => getBroadcastLists())
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [manageList, setManageList] = useState<BroadcastList | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => subscribeToBroadcastLists(() => setLists(getBroadcastLists())), [])

  const karkunLookup = useMemo(() => {
    const map = new Map<string, KarkunRegistryRecord>()
    for (const karkun of getAllKarkuns()) {
      map.set(karkun.id, karkun)
    }
    return map
  }, [])

  const handleCreate = () => {
    if (!newName.trim()) return
    createBroadcastList(newName)
    setNewName('')
  }

  const membersOf = (list: BroadcastList): KarkunRegistryRecord[] =>
    list.memberIds
      .map((id) => karkunLookup.get(id))
      .filter((karkun): karkun is KarkunRegistryRecord => Boolean(karkun))

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Reusable named lists you curate manually — e.g. Women&apos;s Team, New Karkuns.
      </p>

      <div className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Create List
        </h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            className={inputClassName}
            placeholder="List name (e.g. Women's Team)"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <PrimaryButton type="button" onClick={handleCreate} disabled={!newName.trim()}>
            Create
          </PrimaryButton>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-secondary">No broadcast lists yet. Create your first above.</p>
        </div>
      ) : (
        lists.map((list) => {
          const members = membersOf(list)
          const expanded = expandedId === list.id
          return (
            <article
              key={list.id}
              className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {renamingId === list.id ? (
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      className={inputClassName}
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                    />
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        renameBroadcastList(list.id, renameValue)
                        setRenamingId(null)
                      }}
                    >
                      Save
                    </SecondaryButton>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-text-heading">{list.name}</h3>
                    <p className="mt-1 text-sm text-secondary">{list.memberIds.length} members</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : list.id)}
                >
                  👁 {expanded ? 'Hide Members' : 'View Members'}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => setManageList(list)}>
                  Manage Members
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  disabled={members.length === 0}
                  onClick={() => onBroadcast(members.map(toRecipient), list.name)}
                >
                  🟢 Broadcast
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setRenamingId(list.id)
                    setRenameValue(list.name)
                  }}
                >
                  Rename
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    if (
                      typeof window === 'undefined' ||
                      window.confirm(`Delete list "${list.name}"?`)
                    ) {
                      deleteBroadcastList(list.id)
                    }
                  }}
                >
                  Delete
                </SecondaryButton>
              </div>
              {expanded && <MemberList members={members} />}
            </article>
          )
        })
      )}

      {manageList && (
        <ManageMembersModal list={manageList} onClose={() => setManageList(null)} />
      )}
    </div>
  )
}

export function CampaignListsPage() {
  const [tab, setTab] = useState<'dynamic' | 'broadcast'>('dynamic')
  const { sendBroadcastMessage } = useCommunication()
  const [broadcast, setBroadcast] = useState<{
    recipients: MessageRecipient[]
    title: string
  } | null>(null)

  const openBroadcast = (recipients: MessageRecipient[], title: string) => {
    setBroadcast({ recipients: recipients.filter((r) => r.mobile.trim()), title })
  }

  const handleSend = async ({
    templateId,
    message,
  }: {
    templateId?: string
    message: string
  }) => {
    if (!broadcast) return { success: false, error: 'No recipients.' }
    const result = await sendBroadcastMessage({
      channel: 'whatsapp',
      recipients: broadcast.recipients,
      templateId,
      message,
    })
    return result.success > 0
      ? { success: true }
      : { success: false, error: 'No messages could be queued.' }
  }

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-primary text-white' : 'bg-surface-muted text-secondary hover:text-text-heading'
    }`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Campaign Lists</h1>
        <p className="mt-2 text-secondary">
          Reach the right Karkuns fast — dynamic lists update automatically, broadcast lists are
          yours to curate.
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" className={tabClass(tab === 'dynamic')} onClick={() => setTab('dynamic')}>
          Dynamic Lists
        </button>
        <button
          type="button"
          className={tabClass(tab === 'broadcast')}
          onClick={() => setTab('broadcast')}
        >
          Broadcast Lists
        </button>
      </div>

      {tab === 'dynamic' ? (
        <DynamicListsTab onBroadcast={openBroadcast} />
      ) : (
        <BroadcastListsTab onBroadcast={openBroadcast} />
      )}

      {broadcast && (
        <MessageComposerModal
          isOpen
          recipients={broadcast.recipients}
          onClose={() => setBroadcast(null)}
          onSend={handleSend}
          title={`Broadcast — ${broadcast.title} (${broadcast.recipients.length})`}
        />
      )}
    </div>
  )
}
