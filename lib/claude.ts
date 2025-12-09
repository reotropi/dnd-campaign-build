import Anthropic from '@anthropic-ai/sdk';
import { Character, Message, RollData, RollPrompt, GameState } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface DMContext {
  campaign_name: string;
  characters: Character[];
  recent_messages: Message[];
  game_state: GameState;
  current_player_action?: string;
  roll_result?: RollData;
  sender_name?: string;
  character_name?: string;
}

/**
 * Get a response from Claude as the Dungeon Master
 */
export async function getDMResponse(context: DMContext): Promise<{
  response: string;
  rollPrompts?: RollPrompt[];
}> {
  const systemPrompt = buildCampaignContext(context);
  const conversationHistory = buildConversationHistory(context);
  const userMessage = buildUserMessage(context);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1536,
      system: systemPrompt,
      messages: conversationHistory.length > 0
        ? [...conversationHistory, { role: 'user', content: userMessage }]
        : [{ role: 'user', content: userMessage }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the response for roll prompts (can be multiple)
    const rollPrompts = parseRollPrompts(responseText, context.characters);

    return {
      response: responseText,
      rollPrompts: rollPrompts.length > 0 ? rollPrompts : undefined,
    };
  } catch (error) {
    console.error('Error getting DM response:', error);
    throw new Error('Failed to get response from Dungeon Master');
  }
}

/**
 * Build comprehensive campaign context with specific adventure details
 */
function buildCampaignContext(context: DMContext): string {
  const characterList = context.characters
    .map((c) => {
      return `- ${c.name} (${c.race || 'Unknown'} ${c.class} Level ${c.level}) - HP: ${c.current_hp}/${c.max_hp}, AC: ${c.armor_class}, played by ${c.created_by}`;
    })
    .join('\n');

  // Campaign-specific context based on campaign name
  const campaignDetails = getCampaignDetails(context.campaign_name);

  return `You are the Dungeon Master for "${context.campaign_name}", a D&D 5e adventure. You will host this fully in Indonesian Language for the story telling and commands.

${campaignDetails}

PARTY:
${characterList}

${getEnemyContext(context.campaign_name)}

DM GUIDELINES:
1. Start by setting the scene vividly - describe the tavern, Glowkindle's plea, and the cellar entrance
2. When combat starts, call for initiative: "Everyone, roll for initiative!"
3. Track initiative order and announce each player's turn clearly
4. When a player declares an action requiring a roll, prompt them by name
5. Respond to roll results dramatically - describe hits, misses, and damage narratively
6. After a successful hit, always prompt for damage: "[Player name], roll for damage!"
7. Describe enemy actions and their attack rolls
8. Make combat engaging with vivid descriptions
9. Use player names when prompting for rolls

COMBAT RULES (D&D 5e):
- Attack hits if roll ≥ target's AC
- Critical hit on natural 20 (double damage dice)
- Critical miss on natural 1 (automatic miss)
- Saving throws succeed if roll ≥ DC
- Death at 0 HP (start making death saving throws)

IMPORTANT ROLL PROMPTING:
When you want a player to roll, address them by their CHARACTER NAME clearly:
- "Hank, roll for initiative!"
- "Elara, make a Dexterity saving throw (DC 12)!"
- "Gorak, roll for attack against the rat!"
- "Hank, roll damage for your longbow!"
- For group rolls: "Everyone, roll for initiative!"

Be dramatic, engaging, and make players feel like heroes (or occasionally feel the sting of failure)!`;
}

/**
 * Get campaign-specific details
 */
function getCampaignDetails(campaignName: string): string {
  // Check for "A Most Potent Brew" or similar beginner adventures
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `CAMPAIGN BACKGROUND:
The party is in the town of Greenest. Glowkindle, the jovial half-elf owner of The Elfsong Tavern, has a serious problem - giant rats have infested his cellar and are destroying his precious wine and beer barrels. The constant squeaking and scratching is driving away customers, and he's losing money fast.

He's offering a generous reward: 50 gold pieces and free food and drink at the tavern for life to anyone brave enough to clear out the rats. This is a perfect opportunity for beginning adventurers to prove themselves and earn some coin.

The cellar is dark and damp, with wooden support beams, stacks of barrels, and plenty of shadows for rats to hide in. The smell of spilled ale and fermenting wine fills the air.`;
  }

  // Default campaign context for custom campaigns
  return `CAMPAIGN BACKGROUND:
This is an epic D&D 5e adventure where heroes face challenges, uncover mysteries, and forge their legends. The party has gathered together for adventure, fortune, and glory.

Adapt to the players' actions and create memorable moments. Be ready to improvise based on their choices.`;
}

/**
 * Get enemy context for known campaigns
 */
function getEnemyContext(campaignName: string): string {
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `ENEMIES IN THE CELLAR:
- 3 Giant Rats
  * HP: 7 each
  * AC: 12
  * Attack: Bite +4 to hit, reach 5 ft., one target
  * Damage: 1d4+2 piercing damage on hit
  * Behavior: Aggressive, will attack if threatened
  * Tactics: Try to surround and overwhelm individual targets`;
  }

  return `ENCOUNTERS:
Adjust enemy difficulty based on party level and composition. Use D&D 5e encounter building guidelines.`;
}

/**
 * Build conversation history from recent messages
 */
function buildConversationHistory(context: DMContext): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (context.recent_messages.length === 0) return [];

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Take last 15 messages to provide context without overwhelming the model
  const recentMessages = context.recent_messages.slice(-15);

  recentMessages.forEach((msg) => {
    if (msg.message_type === 'dm') {
      // DM messages
      history.push({
        role: 'assistant',
        content: msg.content,
      });
    } else if (msg.message_type === 'chat' || msg.message_type === 'roll') {
      // Player messages (with or without rolls)
      let content = `[${msg.character_id ? 'Player' : 'User'}]: ${msg.content}`;

      // Add roll information if present
      if (msg.roll_data) {
        content += `\n[ROLL: ${msg.roll_data.roll_type} - Total: ${msg.roll_data.total}]`;
      }

      history.push({
        role: 'user',
        content,
      });
    }
  });

  return history;
}

/**
 * Build the user message with current action and roll data
 */
function buildUserMessage(context: DMContext): string {
  let message = '';

  // If this is the very first message, prompt to start the adventure
  if (!context.current_player_action && !context.roll_result && context.recent_messages.length === 0) {
    return 'Begin the adventure! Describe the scene and set up the situation for the players.';
  }

  // Add player action
  if (context.current_player_action) {
    const prefix = context.character_name && context.sender_name
      ? `[${context.sender_name} playing ${context.character_name}]`
      : '[Player]';
    message += `${prefix}: ${context.current_player_action}\n\n`;
  }

  // Add detailed roll result if present
  if (context.roll_result) {
    message += `[ROLL RESULT]\n`;
    message += `Type: ${context.roll_result.roll_type}\n`;
    message += `Advantage: ${context.roll_result.advantage_type}\n`;

    if (context.roll_result.dice && context.roll_result.dice.length > 0) {
      message += `Dice: ${context.roll_result.dice.map(d =>
        `${d.count}${d.dice_type} = ${d.result}${d.individual_rolls ? ` (rolls: ${d.individual_rolls.join(', ')})` : ''}`
      ).join(', ')}\n`;
    }

    if (context.roll_result.modifiers && context.roll_result.modifiers.length > 0) {
      message += `Modifiers: ${context.roll_result.modifiers.map(m =>
        `+${m.value} (${m.source || m.name})`
      ).join(', ')}\n`;
    }

    message += `Total: ${context.roll_result.total}\n`;

    if (context.roll_result.description) {
      message += `Description: ${context.roll_result.description}\n`;
    }

    message += '\n';
  }

  // If no specific action, prompt DM to continue
  if (!context.current_player_action && !context.roll_result) {
    message += 'Continue the adventure. What happens next?\n';
  } else {
    message += 'Respond to this action and roll result. Describe what happens and prompt for next action/roll if needed.\n';
  }

  return message;
}

/**
 * Parse the DM response for multiple roll prompts
 */
function parseRollPrompts(response: string, characters: Character[]): RollPrompt[] {
  const prompts: RollPrompt[] = [];

  // Pattern 1: "Everyone, roll for initiative!"
  if (response.match(/everyone.*roll.*initiative/i)) {
    characters.forEach(character => {
      prompts.push({
        character_name: character.name,
        roll_type: 'initiative',
        description: 'Roll for initiative',
      });
    });
  }

  // Pattern 2: "[CharacterName], roll for [type]"
  const individualPattern = /(\w+),\s*roll\s+(?:for\s+)?(attack|damage|initiative|saving throw|dexterity save|strength save|wisdom save|constitution save|intelligence save|charisma save|skill check|ability check)(?:\s*\(?\s*DC\s*(\d+)\)?)?[:\s]?([^\.!\?]*)/gi;

  let match;
  while ((match = individualPattern.exec(response)) !== null) {
    const [, characterName, rollTypeStr, dc, description] = match;

    // Find the character (case-insensitive)
    const character = characters.find(
      (c) => c.name.toLowerCase() === characterName.toLowerCase()
    );

    if (!character) continue;

    // Map roll type string to RollType
    let rollType: RollPrompt['roll_type'] = 'custom';
    const lowerRollType = rollTypeStr.toLowerCase();

    if (lowerRollType.includes('attack')) rollType = 'attack';
    else if (lowerRollType.includes('damage')) rollType = 'damage';
    else if (lowerRollType.includes('initiative')) rollType = 'initiative';
    else if (lowerRollType.includes('sav')) rollType = 'saving_throw';
    else if (lowerRollType.includes('skill')) rollType = 'skill_check';
    else if (lowerRollType.includes('ability')) rollType = 'ability_check';

    prompts.push({
      character_name: character.name,
      roll_type: rollType,
      description: description?.trim() || rollTypeStr,
      difficulty_class: dc ? parseInt(dc) : undefined,
    });
  }

  // Remove duplicates (same character + roll type)
  const uniquePrompts = prompts.filter((prompt, index, self) =>
    index === self.findIndex((p) =>
      p.character_name === prompt.character_name && p.roll_type === prompt.roll_type
    )
  );

  return uniquePrompts;
}

/**
 * Helper to calculate ability modifier
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Helper to determine if a roll succeeds
 */
export function checkRollSuccess(roll: RollData, dc?: number): boolean {
  if (!dc) return true;
  return roll.total >= dc;
}
