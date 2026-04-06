import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, X, Crosshair, Shield, Map, Users,
  ArrowRight, Loader2, Filter,
} from "lucide-react";
import SearchResultItem from "./SearchResultItem";
import SearchFilters from "./SearchFilters";
import { searchEntities } from "./searchUtils";

export default function GlobalSearchDialog({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveCategory("all");
      setShowFilters(false);
      setFilters({});
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    if (!query.trim() && Object.keys(filters).length === 0) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchEntities(query.trim(), activeCategory, filters);
      setResults(res);
      setSelectedIdx(0);
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeCategory, filters, open]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    }
  }, [results, selectedIdx, onClose]);

  const handleSelect = (item) => {
    onClose();
    if (item.link) navigate(item.link);
  };

  if (!open) return null;

  const categories = [
    { key: "all", label: "ALL", icon: Search },
    { key: "missions", label: "MISSIONS", icon: Crosshair },
    { key: "survivors", label: "SURVIVORS", icon: Users },
    { key: "territories", label: "TERRITORIES", icon: Map },
    { key: "factions", label: "CLANS", icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-[100]" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative mx-auto mt-[10vh] w-full max-w-2xl px-4">
        <div className="border border-primary/30 bg-card rounded-sm shadow-2xl shadow-primary/10 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search missions, survivors, territories, clans..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm h-8 px-0"
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 rounded-sm transition-colors ${showFilters ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-0.5 px-3 py-1.5 border-b border-border/50 bg-secondary/30">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => { setActiveCategory(c.key); setSelectedIdx(0); }}
                className={`flex items-center gap-1 text-[8px] uppercase tracking-wider font-mono px-2 py-1 rounded-sm transition-colors ${
                  activeCategory === c.key
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <c.icon className="h-2.5 w-2.5" />
                {c.label}
              </button>
            ))}
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <SearchFilters
              category={activeCategory}
              filters={filters}
              onChange={setFilters}
            />
          )}

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {results.length === 0 && !loading && query.trim() && (
              <div className="text-center py-8">
                <Search className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground font-mono">NO RESULTS FOUND</p>
              </div>
            )}
            {results.length === 0 && !loading && !query.trim() && Object.keys(filters).length === 0 && (
              <div className="text-center py-8">
                <p className="text-[10px] text-muted-foreground font-mono">TYPE TO SEARCH ACROSS ALL ENTITIES</p>
                <p className="text-[8px] text-muted-foreground/60 mt-1">
                  Use <kbd className="px-1 py-0.5 bg-secondary rounded text-[7px]">Ctrl+K</kbd> to open anytime
                </p>
              </div>
            )}
            {results.map((item, idx) => (
              <SearchResultItem
                key={`${item.type}-${item.id}`}
                item={item}
                isSelected={idx === selectedIdx}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIdx(idx)}
              />
            ))}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="border-t border-border/50 px-3 py-1.5 flex items-center justify-between text-[8px] text-muted-foreground">
              <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <span><kbd className="px-1 py-0.5 bg-secondary rounded text-[7px]">↑↓</kbd> navigate</span>
                <span><kbd className="px-1 py-0.5 bg-secondary rounded text-[7px]">↵</kbd> open</span>
                <span><kbd className="px-1 py-0.5 bg-secondary rounded text-[7px]">esc</kbd> close</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}