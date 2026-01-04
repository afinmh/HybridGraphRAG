/**
 * Utility functions for graph entity and relation processing
 */

export interface Entity {
  name: string;
  type: string;
}

export interface Relation {
  source: string;
  relation: string;
  target: string;
}

/**
 * Normalize entity names for better deduplication
 */
export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // normalize whitespace
    .replace(/[()\[\]]/g, '') // remove parentheses
    .replace(/\.$/, ''); // remove trailing period
}

/**
 * Filter out noise entities based on domain rules
 * Focus on therapeutic entities for "What herb for [condition]" queries
 */
export function filterEntity(entity: Entity): boolean {
  const name = entity.name.toLowerCase();
  const type = entity.type.toLowerCase();
  
  // Skip very short names (likely acronyms without context)
  if (name.length < 3) return false;
  
  // Skip generic experimental/research terms
  const skipTerms = [
    'temperature', 'time', 'conditions', 'controlled conditions',
    'daily cycle', 'experiment', 'study', 'research', 'analysis',
    'test', 'result', 'data', 'group', 'control', 'sample',
    'procedure', 'process', 'measurement', 'observation',
    'material', 'equipment', 'apparatus', 'device', 'instrument',
    'software', 'program', 'tool', 'technique', 'protocol',
    'standard', 'reference', 'baseline', 'comparison',
    'preparation', 'solution', 'mixture', 'suspension',
    'chromatography', 'spectroscopy', 'microscopy',
    'incubation', 'centrifugation', 'filtration', 'dilution',
    'room temperature', 'ambient temperature', 'dark conditions',
    'statistical analysis', 'significance', 'p-value', 'correlation'
  ];
  if (skipTerms.includes(name)) return false;
  
  // Skip standalone numbers or measurements without context
  if (/^\d+[\s°]*(minutes?|hours?|days?|weeks?|months?|°c|ml|mg|g|kg|µg|nm|rpm)$/i.test(name)) return false;
  
  // Skip generic verbs/actions
  if (/^(perform|conduct|carry out|measure|observe|record|collect|obtain|prepare|store)$/i.test(name)) return false;
  
  // PRIORITY 1: Always keep PLANT, DISEASE, SYMPTOM
  if (['plant', 'disease', 'symptom'].some(t => type.includes(t))) return true;
  
  // PRIORITY 2: Keep DOSAGE and therapeutic METHOD
  if (type.includes('dosage')) return true;
  if (type.includes('method') && 
      (name.includes('dose') || name.includes('administration') || 
       name.includes('infusion') || name.includes('decoction') ||
       name.includes('extract') || name.includes('preparation') ||
       name.includes('oral') || name.includes('topical'))) return true;
  
  // PRIORITY 3: Keep therapeutic EFFECT
  if (type.includes('effect') && 
      (name.includes('anti') || name.includes('activity') || 
       name.includes('therapeutic') || name.includes('medicinal'))) return true;
  
  // PRIORITY 4: Keep therapeutically relevant COMPOUND
  if (type.includes('compound') && name.length > 5) return true;
  
  // Skip experimental MECHANISM (keep only if very specific)
  if (type.includes('mechanism') && name.length < 15) return false;
  
  // Skip METHOD if it's experimental procedure
  if (type.includes('method') && 
      (name.includes('chromatography') || name.includes('spectroscopy') ||
       name.includes('analysis') || name.includes('assay') ||
       name.includes('measurement') || name.includes('detection'))) return false;
  
  return true;
}

/**
 * Deduplicate entities using normalized names
 */
export function deduplicateEntities(entities: Entity[]): Entity[] {
  const entityMap = new Map<string, Entity>();
  
  entities.forEach((entity) => {
    const normalizedName = normalizeEntityName(entity.name);
    const key = `${normalizedName}|${entity.type.toLowerCase()}`;
    
    if (!entityMap.has(key)) {
      entityMap.set(key, {
        name: entity.name,
        type: entity.type.toUpperCase() // Standardize type
      });
    }
  });
  
  return Array.from(entityMap.values());
}

/**
 * Filter relations to only include those with valid entities
 * Now more lenient - checks entity name exists regardless of exact type match
 */
export function filterRelationsByEntities(
  relations: Relation[],
  validEntities: Entity[]
): Relation[] {
  // Create set of normalized entity names (without type requirement)
  const entityNames = new Set(
    validEntities.map(e => normalizeEntityName(e.name))
  );
  
  return relations.filter((rel) => {
    if (!rel.source || !rel.relation || !rel.target) return false;
    
    const sourceNorm = normalizeEntityName(rel.source);
    const targetNorm = normalizeEntityName(rel.target);
    
    // Both source and target entities must exist
    return entityNames.has(sourceNorm) && entityNames.has(targetNorm);
  });
}

/**
 * Deduplicate relations
 */
export function deduplicateRelations(relations: Relation[]): Relation[] {
  const relationSet = new Set<string>();
  const uniqueRelations: Relation[] = [];
  
  relations.forEach((relation) => {
    const key = `${relation.source}|${relation.relation}|${relation.target}`;
    if (!relationSet.has(key)) {
      relationSet.add(key);
      uniqueRelations.push(relation);
    }
  });
  
  return uniqueRelations;
}
