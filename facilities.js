// Data-only RV assumptions from Aniimax; the source marks higher levels as partly unverified.
export function presetFacilities(level, definitions, previous = {}) {
  const rv = Math.max(1, Math.min(22, Number(level) || 1));
  return Object.fromEntries(definitions.map(def => {
    const unlocked = Object.entries(def.unlocks).filter(([, required]) => required <= rv).map(([tier]) => Number(tier));
    const tier = Math.max(1, ...unlocked);
    const count = unlocked.length ? def.counts[Math.min(rv - 1, def.counts.length - 1)] || 0 : 0;
    const old = previous[def.name];
    const worker = old?.groups?.[0] || old || {};
    return [def.name, {groups: [{count, level:tier, skill:worker.skill || 1, bonus:!!worker.bonus}]}];
  }));
}

export function facilityGroups(value) {
  if (!value) return [];
  return Array.isArray(value.groups) ? value.groups : [value];
}
