// Add optional goals without activating them or changing the player’s order.
export function includeOptionalPriorities(priorities) {
  const result=Array.isArray(priorities)?priorities.map(p=>({...p})):[];
  for(const id of ['daily','reserve'])if(!result.some(p=>p.id===id))result.push({id,enabled:false});
  return result;
}
