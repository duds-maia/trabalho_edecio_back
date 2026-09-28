import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button/Button'
import { Card } from '../../components/Card/Card'
import { CategoryIcon } from '../../components/CategoryIcon/CategoryIcon'
import { Alert, EmptyState, ErrorState } from '../../components/Feedback/Feedback'
import { Input, TextArea } from '../../components/Input/Input'
import { Skeleton } from '../../components/Loading/Loading'
import { Modal } from '../../components/Modal/Modal'
import { useAsync } from '../../hooks/useAsync'
import { categoryService } from '../../services/category.service'
import type { Category } from '../../types/entities'
import styles from './Admin.module.css'

type Editing = { id?: number; name: string; description: string } | null

export function Categories() {
  const { data, loading, error, reload, setData } = useAsync(() => categoryService.list(), [])
  const [editing, setEditing] = useState<Editing>(null)
  const [removing, setRemoving] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const list = data ?? []

  const closeAll = () => {
    setEditing(null)
    setRemoving(null)
    setFormError(null)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    setFormError(null)
    const payload = { name: editing.name.trim(), description: editing.description.trim() || undefined }
    try {
      if (editing.id) {
        const updated = await categoryService.update(editing.id, payload)
        setData(list.map((c) => (c.id === updated.id ? updated : c)))
      } else {
        const created = await categoryService.create(payload)
        setData([...list, created])
      }
      closeAll()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!removing) return
    setBusy(true)
    setFormError(null)
    try {
      await categoryService.remove(removing.id)
      setData(list.filter((c) => c.id !== removing.id))
      closeAll()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">Tipos de serviço oferecidos na plataforma.</p>
        </div>
        <Button icon={<Plus />} size="sm" onClick={() => setEditing({ name: '', description: '' })}>
          Nova categoria
        </Button>
      </div>

      {loading ? (
        <Skeleton count={4} height={72} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhuma categoria cadastrada" />
      ) : (
        <div className={styles.cards}>
          {list.map((category) => (
            <Card key={category.id} className={styles.row}>
              <CategoryIcon name={category.name} size={22} />
              <div>
                <div className={styles.rowTitle}>{category.name}</div>
                <div className={styles.rowSub}>{category.description ?? 'Sem descrição'}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil />}
                aria-label={`Editar ${category.name}`}
                onClick={() => setEditing({ id: category.id, name: category.name, description: category.description ?? '' })}
              />
              <Button variant="ghost" size="sm" icon={<Trash2 />} aria-label={`Excluir ${category.name}`} onClick={() => setRemoving(category)} />
            </Card>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} title={editing?.id ? 'Editar categoria' : 'Nova categoria'} onClose={closeAll}>
        {editing && (
          <form className="stack" onSubmit={save}>
            <Input label="Nome" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required minLength={2} autoFocus />
            <TextArea label="Descrição (opcional)" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            {formError && <Alert tone="danger">{formError}</Alert>}
            <Button type="submit" block loading={busy}>
              Salvar
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(removing)}
        title={`Excluir ${removing?.name}?`}
        onClose={closeAll}
        footer={
          <>
            <Button variant="ghost" onClick={closeAll}>
              Voltar
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              Excluir
            </Button>
          </>
        }
      >
        <div className="stack">
          <p className="muted">Categorias com prestadores ou solicitações vinculadas não podem ser excluídas.</p>
          {formError && <Alert tone="danger">{formError}</Alert>}
        </div>
      </Modal>
    </div>
  )
}
