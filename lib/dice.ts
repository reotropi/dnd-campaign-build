import { RollData, RollType, AdvantageType, DiceRoll, RollModifier, Character } from '@/types';
import { getAbilityModifier } from './claude';

/**
 * Roll a single die (1 to sides, never 0)
 */
export function rollDie(sides: number): number {
  const result = Math.floor(Math.random() * sides) + 1;
  // Safety check: ensure result is between 1 and sides
  return Math.max(1, Math.min(sides, result));
}

/**
 * Roll multiple dice
 */
export function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  return rolls;
}

/**
 * Parse dice notation (e.g., "2d6", "1d20")
 */
export function parseDiceNotation(notation: string): { count: number; sides: number } | null {
  const match = notation.match(/(\d+)d(\d+)/i);
  if (!match) return null;
  return {
    count: parseInt(match[1]),
    sides: parseInt(match[2]),
  };
}

/**
 * Roll dice with advantage/disadvantage
 */
export function rollWithAdvantage(
  count: number,
  sides: number,
  advantage: AdvantageType
): { rolls: number[]; result: number } {
  if (advantage === 'normal') {
    const rolls = rollDice(count, sides);
    return {
      rolls,
      result: rolls.reduce((sum, roll) => sum + roll, 0),
    };
  }

  // For advantage/disadvantage on d20, roll twice and take higher/lower
  if (sides === 20) {
    const roll1 = rollDice(count, sides);
    const roll2 = rollDice(count, sides);
    const sum1 = roll1.reduce((sum, roll) => sum + roll, 0);
    const sum2 = roll2.reduce((sum, roll) => sum + roll, 0);

    if (advantage === 'advantage') {
      return {
        rolls: sum1 >= sum2 ? roll1 : roll2,
        result: Math.max(sum1, sum2),
      };
    } else {
      return {
        rolls: sum1 <= sum2 ? roll1 : roll2,
        result: Math.min(sum1, sum2),
      };
    }
  }

  // For other dice, advantage doesn't apply
  const rolls = rollDice(count, sides);
  return {
    rolls,
    result: rolls.reduce((sum, roll) => sum + roll, 0),
  };
}

/**
 * Execute a complete roll for a character
 */
export function executeRoll(
  character: Character,
  rollType: RollType,
  advantage: AdvantageType = 'normal',
  customModifier: number = 0
): RollData {
  const dice: DiceRoll[] = [];
  const modifiers: RollModifier[] = [];
  let description = '';

  switch (rollType) {
    case 'initiative':
      description = 'Initiative';
      // Roll d20 + DEX modifier
      const initRoll = rollWithAdvantage(1, 20, advantage);
      dice.push({
        dice_type: 'd20',
        count: 1,
        result: initRoll.result,
        individual_rolls: initRoll.rolls,
      });

      const dexMod = getAbilityModifier(character.dexterity);
      modifiers.push({
        name: 'Dexterity Modifier',
        value: dexMod,
      });
      break;

    case 'attack':
      description = 'Attack Roll';
      // Roll d20 + proficiency + relevant ability modifier
      const attackRoll = rollWithAdvantage(1, 20, advantage);
      dice.push({
        dice_type: 'd20',
        count: 1,
        result: attackRoll.result,
        individual_rolls: attackRoll.rolls,
      });

      modifiers.push({
        name: 'Proficiency Bonus',
        value: character.proficiency_bonus,
      });

      // Use STR or DEX modifier (higher of the two for versatility)
      const strMod = getAbilityModifier(character.strength);
      const dexModAtk = getAbilityModifier(character.dexterity);
      const atkMod = Math.max(strMod, dexModAtk);
      modifiers.push({
        name: atkMod === strMod ? 'Strength Modifier' : 'Dexterity Modifier',
        value: atkMod,
      });
      break;

    case 'damage':
      description = 'Damage Roll';
      // Roll weapon damage (default to 1d8 if no weapon specified)
      const weaponDice = character.weapons && character.weapons.length > 0
        ? parseDiceNotation(character.weapons[0].damage_dice)
        : { count: 1, sides: 8 };

      if (weaponDice) {
        const dmgRoll = rollDice(weaponDice.count, weaponDice.sides);
        dice.push({
          dice_type: `d${weaponDice.sides}`,
          count: weaponDice.count,
          result: dmgRoll.reduce((sum, r) => sum + r, 0),
          individual_rolls: dmgRoll,
        });
      }

      // Add ability modifier to damage
      const strModDmg = getAbilityModifier(character.strength);
      const dexModDmg = getAbilityModifier(character.dexterity);
      const dmgMod = Math.max(strModDmg, dexModDmg);
      modifiers.push({
        name: dmgMod === strModDmg ? 'Strength Modifier' : 'Dexterity Modifier',
        value: dmgMod,
      });
      break;

    case 'saving_throw':
      description = 'Saving Throw';
      // Roll d20 + ability modifier
      const saveRoll = rollWithAdvantage(1, 20, advantage);
      dice.push({
        dice_type: 'd20',
        count: 1,
        result: saveRoll.result,
        individual_rolls: saveRoll.rolls,
      });

      // Use highest ability modifier (or could be specific to the save type)
      const conMod = getAbilityModifier(character.constitution);
      modifiers.push({
        name: 'Constitution Modifier',
        value: conMod,
      });
      break;

    case 'ability_check':
    case 'skill_check':
      description = rollType === 'ability_check' ? 'Ability Check' : 'Skill Check';
      // Roll d20 + ability modifier + proficiency (if applicable)
      const checkRoll = rollWithAdvantage(1, 20, advantage);
      dice.push({
        dice_type: 'd20',
        count: 1,
        result: checkRoll.result,
        individual_rolls: checkRoll.rolls,
      });

      // Add relevant ability modifier (use DEX as default)
      const abilityMod = getAbilityModifier(character.dexterity);
      modifiers.push({
        name: 'Ability Modifier',
        value: abilityMod,
      });
      break;

    case 'custom':
      description = 'Custom Roll';
      const customRoll = rollWithAdvantage(1, 20, advantage);
      dice.push({
        dice_type: 'd20',
        count: 1,
        result: customRoll.result,
        individual_rolls: customRoll.rolls,
      });
      break;
  }

  // Add custom modifier if provided
  if (customModifier !== 0) {
    modifiers.push({
      name: 'Custom Modifier',
      value: customModifier,
    });
  }

  // Calculate total
  const diceTotal = dice.reduce((sum, d) => sum + d.result, 0);
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
  const total = diceTotal + modifierTotal;

  return {
    roll_type: rollType,
    advantage_type: advantage,
    dice,
    modifiers,
    total,
    description,
    character_name: character.name,
  };
}

/**
 * Format roll data for display
 */
export function formatRollResult(roll: RollData): string {
  const diceStr = roll.dice.map((d) => {
    if (d.individual_rolls && d.individual_rolls.length > 1) {
      return `${d.individual_rolls.join('+')} (${d.count}${d.dice_type})`;
    }
    return `${d.result} (${d.count}${d.dice_type})`;
  }).join(' + ');

  const modStr = roll.modifiers.map((m) => {
    return `${m.value >= 0 ? '+' : ''}${m.value} (${m.name})`;
  }).join(' ');

  return `${diceStr}${modStr ? ' ' + modStr : ''} = ${roll.total}`;
}

/**
 * Get the dice color for display (based on dice type)
 */
export function getDiceColor(diceType: string): string {
  switch (diceType) {
    case 'd20':
      return 'blue';
    case 'd12':
      return 'violet';
    case 'd10':
      return 'grape';
    case 'd8':
      return 'cyan';
    case 'd6':
      return 'teal';
    case 'd4':
      return 'green';
    default:
      return 'gray';
  }
}
