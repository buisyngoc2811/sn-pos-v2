import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, SearchX } from 'lucide-react'

export function PageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-label="Đang tải nội dung">
      <span className="ui-loading-state" />
      <div>
        <span className="ui-loading-state" />
        <span className="ui-loading-state" />
        <span className="ui-loading-state" />
        <span className="ui-loading-state" />
      </div>
      <span className="ui-loading-state page-skeleton-content" />
    </div>
  )
}

type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="ui-empty-state" role="status">
      <SearchX aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}

type PageErrorBoundaryProps = {
  children: ReactNode
}

type PageErrorBoundaryState = {
  hasError: boolean
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Không thể hiển thị trang', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ui-error-state" role="alert">
          <AlertTriangle aria-hidden="true" />
          <strong>Không thể hiển thị trang</strong>
          <p>Hãy tải lại trang để thử lại.</p>
          <button type="button" onClick={() => window.location.reload()}>Tải lại trang</button>
        </div>
      )
    }

    return this.props.children
  }
}
