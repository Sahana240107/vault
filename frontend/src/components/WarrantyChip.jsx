const WarrantyChip = ({ warrantyExpiry }) => {
  if (!warrantyExpiry)
    return <span className="chip" style={{ background:'var(--deep)', borderColor:'var(--border)', color:'var(--text-muted)' }}>No warranty</span>;

  const days = Math.floor((new Date(warrantyExpiry) - new Date()) / (1000 * 60 * 60 * 24));

  if (days < 0)    return <span className="chip danger">Expired</span>;
  if (days <= 7)   return <span className="chip danger">⚠ {days}d left</span>;
  if (days <= 30)  return <span className="chip warn">⏳ {days}d left</span>;
  return <span className="chip green">✓ Active · {Math.floor(days / 30)}mo left</span>;
};

export default WarrantyChip;