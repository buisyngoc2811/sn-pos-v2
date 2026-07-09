import type { ChangeEventHandler, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

type PageIntroProps = {
  kicker: string
  title: string
  description: string
  action?: ReactNode
}

export function PageIntro({ kicker, title, description, action }: PageIntroProps) {
  return (
    <section className="products-intro">
      <div>
        <p className="products-kicker">{kicker}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </section>
  )
}

type SearchFieldProps = {
  label: string
  placeholder: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
}

export function SearchField({ label, placeholder, value, onChange }: SearchFieldProps) {
  return (
    <label className="products-search">
      <Search aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input type="search" value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  )
}

type PaginationProps = {
  label: string
  summary: ReactNode
  page: number
  onPageChange: (page: number) => void
  pageCount?: number
}

export function Pagination({
  label,
  summary,
  page,
  onPageChange,
  pageCount = 3,
}: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)

  return (
    <footer className="products-pagination">
      <span>{summary}</span>
      <nav aria-label={label}>
        <button
          type="button"
          aria-label="Trang trước"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        {pages.map((number) => (
          <button
            type="button"
            key={number}
            className={page === number ? 'is-current' : ''}
            aria-current={page === number ? 'page' : undefined}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          aria-label="Trang sau"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>
    </footer>
  )
}
