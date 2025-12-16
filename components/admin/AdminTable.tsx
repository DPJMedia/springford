import { Article } from "@/lib/mockData";
import { StatusBadge } from "../StatusBadge";

type AdminTableProps = {
  articles: Article[];
};

export function AdminTable({ articles }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-soft">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 text-[color:var(--color-dark)]">
          <tr>
            <Th>Title</Th>
            <Th>Status</Th>
            <Th>Category</Th>
            <Th>Location</Th>
            <Th>Date</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr
              key={article.id}
              className="border-t border-[color:var(--color-border)] transition hover:bg-blue-50"
            >
              <Td>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-[color:var(--color-dark)]">
                    {article.title}
                  </span>
                  <span className="text-xs text-[color:var(--color-medium)] line-clamp-1">
                    {article.excerpt}
                  </span>
                </div>
              </Td>
              <Td>
                <StatusBadge status={article.status} scheduledFor={article.scheduledFor} />
              </Td>
              <Td className="text-[color:var(--color-medium)]">{article.category}</Td>
              <Td className="text-[color:var(--color-medium)]">
                {article.neighborhood}, {article.town}
              </Td>
              <Td className="text-[color:var(--color-medium)]">
                {new Date(article.date).toLocaleDateString()}
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1.5">
                  <button className="rounded border border-[color:var(--color-border)] px-2 py-1 text-xs font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition">
                    Edit
                  </button>
                  <button className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition">
                    Publish
                  </button>
                  <button className="rounded border border-[color:var(--color-border)] px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition">
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type CellProps = {
  children: React.ReactNode;
  className?: string;
};

function Th({ children, className = "" }: CellProps) {
  return (
    <th className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: CellProps) {
  return <td className={`px-3 py-2.5 align-top ${className}`}>{children}</td>;
}

