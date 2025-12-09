/**
 * Maps external character JSON format to database schema
 */

interface ExternalCharacterData {
  character_name: string;
  class: string;
  level: number;
  hp_current: number;
  hp_max: number;
  ac: number;
  initiative?: number;
  proficiency: number;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  skills: Record<string, number>;
  weapons: any[];
  spells: any[];
  spell_slots_max?: Record<string, number>;
  spell_slots_current?: Record<string, number>;
  equipment?: any[];
  saving_throws?: Record<string, number>;
  passive_perception?: number;
  passive_investigation?: number;
  passive_insight?: number;
  conditions?: string[];
  notes?: string;
  background?: string;
  alignment?: string;
  race?: string;
}

interface DatabaseCharacterData {
  name: string;
  class: string;
  level: number;
  current_hp: number;
  max_hp: number;
  armor_class: number;
  proficiency_bonus: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  skills: Record<string, number>;
  weapons: any[];
  spells: any[];
  spell_slots: Record<string, any>;
  inventory: any[];
  features: any[];
  notes?: string;
  background?: string;
  race?: string;
}

/**
 * Transforms external character format to database format
 */
export function mapCharacterToDatabase(
  external: ExternalCharacterData,
  createdBy: string,
  sessionId?: string | null
): DatabaseCharacterData & { session_id: string | null; created_by: string } {
  // Combine spell slots into one object
  const spellSlots: Record<string, any> = {};

  if (external.spell_slots_max || external.spell_slots_current) {
    const maxSlots = external.spell_slots_max || {};
    const currentSlots = external.spell_slots_current || {};

    // Create combined spell slots object
    Object.keys(maxSlots).forEach((level) => {
      spellSlots[`level_${level}`] = {
        max: maxSlots[level] || 0,
        current: currentSlots[level] || maxSlots[level] || 0,
      };
    });
  }

  // Create features array from passive scores and conditions
  const features: any[] = [];

  if (external.passive_perception !== undefined) {
    features.push({
      name: 'Passive Perception',
      description: `${external.passive_perception}`,
      source: 'Calculated',
    });
  }

  if (external.passive_investigation !== undefined) {
    features.push({
      name: 'Passive Investigation',
      description: `${external.passive_investigation}`,
      source: 'Calculated',
    });
  }

  if (external.passive_insight !== undefined) {
    features.push({
      name: 'Passive Insight',
      description: `${external.passive_insight}`,
      source: 'Calculated',
    });
  }

  if (external.initiative !== undefined) {
    features.push({
      name: 'Initiative',
      description: `+${external.initiative}`,
      source: 'Calculated',
    });
  }

  if (external.saving_throws) {
    features.push({
      name: 'Saving Throws',
      description: JSON.stringify(external.saving_throws),
      source: 'Character',
    });
  }

  if (external.alignment) {
    features.push({
      name: 'Alignment',
      description: external.alignment,
      source: 'Character',
    });
  }

  if (external.conditions && external.conditions.length > 0) {
    features.push({
      name: 'Active Conditions',
      description: external.conditions.join(', '),
      source: 'Status',
    });
  }

  return {
    session_id: sessionId || null,
    created_by: createdBy,
    name: external.character_name,
    class: external.class,
    level: external.level,
    current_hp: external.hp_current,
    max_hp: external.hp_max,
    armor_class: external.ac,
    proficiency_bonus: external.proficiency,
    strength: external.stats.strength,
    dexterity: external.stats.dexterity,
    constitution: external.stats.constitution,
    intelligence: external.stats.intelligence,
    wisdom: external.stats.wisdom,
    charisma: external.stats.charisma,
    skills: external.skills,
    weapons: external.weapons || [],
    spells: external.spells || [],
    spell_slots: spellSlots,
    inventory: external.equipment || [],
    features: features,
    notes: external.notes,
    background: external.background,
    race: external.race,
  };
}

/**
 * Transforms database format back to external format
 */
export function mapDatabaseToCharacter(
  dbChar: any
): ExternalCharacterData {
  // Extract spell slots
  const spellSlotsMax: Record<string, number> = {};
  const spellSlotsCurrent: Record<string, number> = {};

  Object.keys(dbChar.spell_slots || {}).forEach((key) => {
    const level = key.replace('level_', '');
    const slots = dbChar.spell_slots[key];
    if (typeof slots === 'object') {
      spellSlotsMax[level] = slots.max || 0;
      spellSlotsCurrent[level] = slots.current || 0;
    }
  });

  // Extract features
  let initiative: number | undefined;
  let passivePerception: number | undefined;
  let passiveInvestigation: number | undefined;
  let passiveInsight: number | undefined;
  let savingThrows: Record<string, number> | undefined;
  let alignment: string | undefined;
  let conditions: string[] = [];

  (dbChar.features || []).forEach((feature: any) => {
    if (feature.name === 'Initiative') {
      initiative = parseInt(feature.description.replace('+', ''));
    } else if (feature.name === 'Passive Perception') {
      passivePerception = parseInt(feature.description);
    } else if (feature.name === 'Passive Investigation') {
      passiveInvestigation = parseInt(feature.description);
    } else if (feature.name === 'Passive Insight') {
      passiveInsight = parseInt(feature.description);
    } else if (feature.name === 'Saving Throws') {
      try {
        savingThrows = JSON.parse(feature.description);
      } catch (e) {}
    } else if (feature.name === 'Alignment') {
      alignment = feature.description;
    } else if (feature.name === 'Active Conditions') {
      conditions = feature.description.split(', ');
    }
  });

  return {
    character_name: dbChar.name,
    class: dbChar.class,
    level: dbChar.level,
    hp_current: dbChar.current_hp,
    hp_max: dbChar.max_hp,
    ac: dbChar.armor_class,
    initiative,
    proficiency: dbChar.proficiency_bonus,
    stats: {
      strength: dbChar.strength,
      dexterity: dbChar.dexterity,
      constitution: dbChar.constitution,
      intelligence: dbChar.intelligence,
      wisdom: dbChar.wisdom,
      charisma: dbChar.charisma,
    },
    skills: dbChar.skills || {},
    weapons: dbChar.weapons || [],
    spells: dbChar.spells || [],
    spell_slots_max: spellSlotsMax,
    spell_slots_current: spellSlotsCurrent,
    equipment: dbChar.inventory || [],
    saving_throws: savingThrows,
    passive_perception: passivePerception,
    passive_investigation: passiveInvestigation,
    passive_insight: passiveInsight,
    conditions,
    notes: dbChar.notes,
    background: dbChar.background,
    alignment,
    race: dbChar.race,
  };
}
