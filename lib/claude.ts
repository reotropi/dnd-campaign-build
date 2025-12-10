import Anthropic from '@anthropic-ai/sdk';
import { Character, Message, RollData, RollPrompt, GameState } from '@/types';
import { CombatUpdate, InitCombatParams } from '@/types/combat';
import { rollDice } from './dice';

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
  dm_language?: 'indonesian' | 'english';
  session_id?: string; // Added for combat state management
}

interface CharacterUpdate {
  character_name: string;
  hp_change?: number; // negative for damage, positive for healing
  spell_slot_used?: { level: number }; // which spell slot was used
  long_rest?: boolean; // restore all HP and spell slots
}

/**
 * Get a response from Claude as the Dungeon Master
 */
export async function getDMResponse(context: DMContext): Promise<{
  response: string;
  rollPrompts?: RollPrompt[];
  characterUpdates?: CharacterUpdate[];
}> {
  const systemPrompt = buildCampaignContext(context);
  const conversationHistory = buildConversationHistory(context);
  const userMessage = buildUserMessage(context);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096, // Increased from 2048 to allow for full combat sequences
      system: systemPrompt,
      messages: conversationHistory.length > 0
        ? [...conversationHistory, { role: 'user', content: userMessage }]
        : [{ role: 'user', content: userMessage }],
      tools: [
        {
          name: 'request_roll',
          description: 'Request a specific character to make a dice roll',
          input_schema: {
            type: 'object',
            properties: {
              character_name: {
                type: 'string',
                description: 'The name of the character who should roll',
              },
              roll_type: {
                type: 'string',
                enum: ['initiative', 'attack', 'damage', 'saving_throw', 'ability_check', 'skill_check'],
                description: 'The type of roll needed',
              },
              description: {
                type: 'string',
                description: 'A brief description of why this roll is needed',
              },
            },
            required: ['character_name', 'roll_type', 'description'],
          },
        },
        {
          name: 'apply_damage',
          description: 'Apply damage or healing to one or more characters',
          input_schema: {
            type: 'object',
            properties: {
              character_names: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of character names taking damage or healing. Use ["all"] to affect all party members.',
              },
              amount: {
                type: 'number',
                description: 'Amount of HP change (positive for healing, negative for damage)',
              },
            },
            required: ['character_names', 'amount'],
          },
        },
        {
          name: 'roll_dice',
          description: 'Roll dice for enemies, NPCs, or any DM-controlled rolls. Returns actual random results.',
          input_schema: {
            type: 'object',
            properties: {
              dice_notation: {
                type: 'string',
                description: 'Dice notation like "1d20", "2d6+3", "1d8+2". Can include modifiers.',
              },
              roll_name: {
                type: 'string',
                description: 'Description of the roll (e.g., "Rat attack roll", "Goblin damage")',
              },
            },
            required: ['dice_notation', 'roll_name'],
          },
        },
        {
          name: 'use_spell_slot',
          description: 'Mark a spell slot as used for a character',
          input_schema: {
            type: 'object',
            properties: {
              character_name: {
                type: 'string',
                description: 'The name of the character using the spell slot',
              },
              spell_level: {
                type: 'number',
                description: 'The level of the spell slot being used (1-9)',
              },
            },
            required: ['character_name', 'spell_level'],
          },
        },
        {
          name: 'long_rest',
          description: 'Character takes a long rest (8 hours) - restores all HP and spell slots',
          input_schema: {
            type: 'object',
            properties: {
              character_name: {
                type: 'string',
                description: 'The name of the character taking a long rest',
              },
            },
            required: ['character_name'],
          },
        },
        {
          name: 'init_combat',
          description: 'Initialize combat with enemies. Use this when combat starts. System will automatically request initiative from all players.',
          input_schema: {
            type: 'object',
            properties: {
              enemies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Enemy type name (e.g., "Giant Rat", "Goblin")',
                    },
                    count: {
                      type: 'number',
                      description: 'How many of this enemy type',
                    },
                    hp: {
                      type: 'number',
                      description: 'Hit points for each enemy',
                    },
                    ac: {
                      type: 'number',
                      description: 'Armor class',
                    },
                    attack_bonus: {
                      type: 'number',
                      description: 'Attack roll bonus (e.g., +4)',
                    },
                    damage_dice: {
                      type: 'string',
                      description: 'Damage dice notation (e.g., "1d6+2")',
                    },
                  },
                  required: ['name', 'count', 'hp', 'ac', 'attack_bonus', 'damage_dice'],
                },
                description: 'Array of enemy types and their stats',
              },
            },
            required: ['enemies'],
          },
        },
        {
          name: 'update_combat',
          description: 'Update combat state with damage, healing, conditions, or deaths. Use after resolving attacks or effects.',
          input_schema: {
            type: 'object',
            properties: {
              damage_dealt: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    target_id: {
                      type: 'string',
                      description: 'character_id for players, enemy id for enemies',
                    },
                    amount: {
                      type: 'number',
                      description: 'Damage amount',
                    },
                  },
                  required: ['target_id', 'amount'],
                },
                description: 'Array of damage to apply',
              },
              healing: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    target_id: { type: 'string' },
                    amount: { type: 'number' },
                  },
                  required: ['target_id', 'amount'],
                },
                description: 'Array of healing to apply',
              },
              conditions_added: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    target_id: { type: 'string' },
                    conditions: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Conditions like "poisoned", "prone", "stunned"',
                    },
                  },
                  required: ['target_id', 'conditions'],
                },
                description: 'Conditions to add to combatants',
              },
              conditions_removed: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    target_id: { type: 'string' },
                    conditions: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['target_id', 'conditions'],
                },
                description: 'Conditions to remove from combatants',
              },
              enemies_killed: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of enemy IDs to mark as dead',
              },
              turn_complete: {
                type: 'boolean',
                description: 'Set to true to advance to the next turn',
              },
            },
          },
        },
        {
          name: 'end_combat',
          description: 'End combat encounter. Use when all enemies are defeated or combat concludes.',
          input_schema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    });

    let responseText = '';
    const rollPrompts: RollPrompt[] = [];
    const characterUpdates: CharacterUpdate[] = [];

    // Log the raw message for debugging
    console.log('Claude API response:', JSON.stringify(message, null, 2));

    // Process all content blocks
    for (const block of message.content) {
      if (block.type === 'text') {
        responseText += block.text;
      } else if (block.type === 'tool_use') {
        // Handle tool calls
        if (block.name === 'request_roll') {
          const input = block.input as any;
          rollPrompts.push({
            character_name: input.character_name,
            roll_type: input.roll_type as RollPrompt['roll_type'],
            description: input.description,
          });
        } else if (block.name === 'apply_damage') {
          const input = block.input as any;
          const targetNames: string[] = input.character_names || [];

          // Handle "all" keyword
          if (targetNames.includes('all')) {
            // Apply to all characters
            context.characters.forEach(char => {
              characterUpdates.push({
                character_name: char.name,
                hp_change: input.amount,
              });
            });
          } else {
            // Apply to specific characters
            targetNames.forEach(name => {
              characterUpdates.push({
                character_name: name,
                hp_change: input.amount,
              });
            });
          }
        } else if (block.name === 'use_spell_slot') {
          const input = block.input as any;
          characterUpdates.push({
            character_name: input.character_name,
            spell_slot_used: { level: input.spell_level },
          });
        } else if (block.name === 'long_rest') {
          const input = block.input as any;
          characterUpdates.push({
            character_name: input.character_name,
            long_rest: true,
          });
        } else if (block.name === 'roll_dice') {
          const input = block.input as any;
          const diceNotation = input.dice_notation as string;
          const rollName = input.roll_name as string;

          // Parse dice notation (e.g., "1d20+4" → {count: 1, sides: 20, modifier: 4})
          const match = diceNotation.match(/(\d+)d(\d+)([+\-]\d+)?/i);
          if (match) {
            const count = parseInt(match[1]);
            const sides = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[3]) : 0;

            // Roll the dice
            const rolls = rollDice(count, sides);
            const diceTotal = rolls.reduce((sum, r) => sum + r, 0);
            const total = diceTotal + modifier;

            // Inject the roll result into the response text
            const rollResult = `[${rollName}: ${count}d${sides}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''} = ${rolls.join('+')}${modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''} = **${total}**]`;
            responseText += `\n${rollResult}`;
          }
        } else if (block.name === 'init_combat') {
          const input = block.input as InitCombatParams;

          // Call the init combat API
          if (context.session_id) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/combat/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: context.session_id,
                  enemies: input.enemies,
                }),
              });

              const result = await response.json();
              if (result.success) {
                responseText += `\n\n[Combat initialized! ${result.message}]`;
              }
            } catch (error) {
              console.error('Error initializing combat:', error);
            }
          }
        } else if (block.name === 'update_combat') {
          const input = block.input as CombatUpdate;

          // Call the update combat API
          if (context.session_id) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/combat/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: context.session_id,
                  changes: input,
                }),
              });

              const result = await response.json();
              if (result.combat_ended) {
                responseText += `\n\n[Combat ended!]`;
              }
            } catch (error) {
              console.error('Error updating combat:', error);
            }
          }
        } else if (block.name === 'end_combat') {
          // Call the end combat API
          if (context.session_id) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/combat/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: context.session_id,
                }),
              });

              const result = await response.json();
              if (result.success) {
                responseText += `\n\n[${result.message}]`;
              }
            } catch (error) {
              console.error('Error ending combat:', error);
            }
          }
        }
      }
    }

    // Warn if response is empty - this usually means only tool calls were returned
    if (!responseText || responseText.trim() === '') {
      console.warn('Claude returned empty response! Message content:', message.content);
      console.warn('Stop reason:', message.stop_reason);
      console.warn('Tool calls made:', rollPrompts, characterUpdates);

      // If we have roll prompts, that's probably the issue
      if (rollPrompts.length > 0) {
        console.warn('Claude returned only roll prompts without narrative text!');
        responseText = '*[DM is waiting for your roll]*';
      } else {
        responseText = '*The Dungeon Master pauses, deep in thought...*\n\nTry rephrasing your action or asking what you should do next.';
      }
    }

    // Validate: If combat is active and response mentions damage but no update_combat was called
    if (context.game_state?.combat_state?.active) {
      const combatToolCalled = message.content.some(
        (block: any) => block.type === 'tool_use' &&
        (block.name === 'update_combat' || block.name === 'init_combat' || block.name === 'end_combat')
      );

      const mentionsDamage = /damage|hit|dies?|killed|HP|health/i.test(responseText);

      if (mentionsDamage && !combatToolCalled) {
        console.warn('⚠️ WARNING: Combat active, narrative mentions damage/death, but no combat tool called!');
        console.warn('Response:', responseText);
        responseText += '\n\n*[System: Combat state may be out of sync - DM forgot to update state]*';
      }
    }

    return {
      response: responseText,
      rollPrompts: rollPrompts.length > 0 ? rollPrompts : undefined,
      characterUpdates: characterUpdates.length > 0 ? characterUpdates : undefined,
    };
  } catch (error) {
    console.error('Error getting DM response:', error);
    throw new Error('Failed to get response from Dungeon Master');
  }
}

/**
 * Build detailed character status for DM context
 */
function buildDetailedCharacterStatus(characters: Character[]): string {
  return characters.map((c) => {
    const abilityMods = {
      STR: Math.floor((c.strength - 10) / 2),
      DEX: Math.floor((c.dexterity - 10) / 2),
      CON: Math.floor((c.constitution - 10) / 2),
      INT: Math.floor((c.intelligence - 10) / 2),
      WIS: Math.floor((c.wisdom - 10) / 2),
      CHA: Math.floor((c.charisma - 10) / 2),
    };

    let status = `\n${c.name} (${c.race || 'Unknown'} ${c.class} Level ${c.level}) - played by ${c.created_by}\n`;
    status += `  HP: ${c.current_hp}/${c.max_hp} | AC: ${c.armor_class} | Proficiency: +${c.proficiency_bonus}\n`;
    status += `  Abilities: STR ${c.strength}(${abilityMods.STR>=0?'+':''}${abilityMods.STR}), DEX ${c.dexterity}(${abilityMods.DEX>=0?'+':''}${abilityMods.DEX}), CON ${c.constitution}(${abilityMods.CON>=0?'+':''}${abilityMods.CON}), INT ${c.intelligence}(${abilityMods.INT>=0?'+':''}${abilityMods.INT}), WIS ${c.wisdom}(${abilityMods.WIS>=0?'+':''}${abilityMods.WIS}), CHA ${c.charisma}(${abilityMods.CHA>=0?'+':''}${abilityMods.CHA})\n`;

    // Weapons
    if (c.weapons && c.weapons.length > 0) {
      status += `  Weapons: ${c.weapons.map(w => `${w.name} (${w.damage_dice} ${w.damage_type})`).join(', ')}\n`;
    }

    // Spell slots
    if (c.spell_slots) {
      const slots = Object.entries(c.spell_slots)
        .filter(([_, value]) => value && value > 0)
        .map(([level, count]) => `L${level.replace('level_', '')}:${count}`)
        .join(', ');
      if (slots) {
        status += `  Spell Slots: ${slots}\n`;
      }
    }

    // Spells (first few)
    if (c.spells && c.spells.length > 0) {
      const spellList = c.spells.slice(0, 5).map(s => `${s.name} (L${s.level})`).join(', ');
      status += `  Spells: ${spellList}${c.spells.length > 5 ? ` +${c.spells.length - 5} more` : ''}\n`;
    }

    // Notable skills (proficient ones)
    if (c.skills) {
      const proficientSkills = Object.entries(c.skills)
        .filter(([_, bonus]) => bonus !== undefined && bonus > 0)
        .map(([skill, bonus]) => `${skill} +${bonus}`)
        .slice(0, 5);
      if (proficientSkills.length > 0) {
        status += `  Key Skills: ${proficientSkills.join(', ')}\n`;
      }
    }

    return status;
  }).join('\n');
}

/**
 * Build comprehensive campaign context with specific adventure details
 */
function buildCampaignContext(context: DMContext): string {
  const characterList = buildDetailedCharacterStatus(context.characters);

  // Campaign-specific context based on campaign name
  const campaignDetails = getCampaignDetails(context.campaign_name);

  const languageInstruction = context.dm_language === 'english'
    ? 'You will host this adventure in English for storytelling and commands.'
    : 'You will host this fully in Indonesian Language for the story telling and commands.';

  return `You are the Dungeon Master for "${context.campaign_name}", a D&D 5e adventure. ${languageInstruction}

${campaignDetails}

PARTY (This detailed information is for your reference only - players already know their own stats):
${characterList}

${getEnemyContext(context.campaign_name)}

${getCombatStateContext(context)}

DM GUIDELINES:

🚨 **NEW COMBAT SYSTEM - STRUCTURED STATE:**

The combat system now uses structured state management. You have new tools for combat:
- init_combat: Start combat with enemy details
- update_combat: Update damage/healing/conditions/deaths
- end_combat: End combat encounter

**COMBAT FLOW:**

1. **STARTING COMBAT:**
   - When combat begins, use init_combat tool with enemy stats
   - Example: init_combat with enemies: [{ name: "Giant Rat", count: 3, hp: 7, ac: 8, attack_bonus: 4, damage_dice: "1d4+2" }]
   - System will automatically request initiative from ALL players
   - After all players roll, use roll_dice for each enemy's initiative
   - System will create turn order automatically

2. **DURING COMBAT:**
   - ⚠️ **CRITICAL**: You MUST call update_combat for EVERY damage/healing/death that happens
   - DO NOT just describe damage in text - you MUST also update the state via tool call
   - The combat_state JSON is the source of truth - if you don't update it, the change doesn't happen
   - Example: "Rat #2 takes 6 damage!" → MUST call update_combat({ damage_dealt: [{ target_id: "rat_2_id", amount: 6 }] })
   - Example: "Rat #3 dies!" → MUST call update_combat({ enemies_killed: ["rat_3_id"] })
   - System automatically tracks changes - but only if you call the tool!

3. **TURN MANAGEMENT:**
   - When a turn ends, MUST call update_combat with turn_complete: true
   - System will advance to next combatant automatically
   - Dead enemies are automatically skipped
   - DO NOT announce whose turn it is - let the system handle turn order

4. **ENEMY ATTACKS (MANDATORY SEQUENCE):**
   For EACH enemy attack:
   a) Roll attack with roll_dice (1d20+modifier)
   b) Compare to player's AC - announce hit or miss
   c) If hit: Roll damage with roll_dice
   d) If hit: MANDATORY - Call update_combat with damage_dealt
   e) MANDATORY - Call update_combat with turn_complete: true
   f) Complete ALL enemy turns before next player

   ⚠️ **IF YOU FORGET TO CALL update_combat, THE DAMAGE DOESN'T HAPPEN IN THE GAME STATE!**

5. **COMPLETING COMBAT:**
   - When all enemies dead OR quest objective met, call end_combat
   - System will clear combat state

**LEGACY TOOLS (Still Available):**
- roll_dice: ALL enemy/NPC rolls (attacks, damage, saves, etc.)
- request_roll: Request player to roll (initiative, attacks, saves, skills)
- apply_damage: Apply HP changes (now prefer update_combat for combat scenarios)
- use_spell_slot: Track spell usage
- long_rest: Full recovery

**CRITICAL HIT:** Natural 20 = double damage dice only (not modifiers). Example: 1d8+3 becomes 2d8+3

**DEATH:** If player reaches 0 HP and others survive, continue. If all players reach 0, quest fails OR friendly NPC rescues them.

Be dramatic and engaging!`;
}

/**
 * Get campaign-specific details
 */
function getCampaignDetails(campaignName: string): string {
  // Check for "A Most Potent Brew" or similar beginner adventures
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `CAMPAIGN: "A Most Potent Brew"
Location: The Elfsong Tavern, Greenest
Quest Giver: Glowkindle (jovial half-elf tavern owner)
Quest: Clear the cellar of giant rats
Reward: 50 gold pieces + free food/drink for life

After rats defeated: Glowkindle celebrates, pays the reward, and the party becomes local heroes. Continue the adventure - they can explore Greenest, hear rumors of other quests, or rest at the tavern.`;
  }

  // Default campaign context for custom campaigns
  return `CAMPAIGN: Custom Adventure
Continue the story naturally based on player actions. Create memorable moments and improvise as needed.`;
}

/**
 * Get enemy context for known campaigns
 */
function getEnemyContext(campaignName: string): string {
  if (campaignName.toLowerCase().includes('potent brew') ||
      campaignName.toLowerCase().includes('most potent')) {
    return `INITIAL ENCOUNTER: 3 Giant Rats (HP: 7, AC: 8, Bite: +4 hit / 1d4+2 damage)`;
  }

  return `Create appropriate encounters based on party level.`;
}

/**
 * Get current combat state context for Claude
 */
function getCombatStateContext(context: DMContext): string {
  const combatState = context.game_state?.combat_state as any;

  if (!combatState || !combatState.active) {
    return ''; // No combat active
  }

  let combatContext = '\n🗡️ **ACTIVE COMBAT STATE:**\n\n';
  combatContext += `Round: ${combatState.round}\n`;
  combatContext += `Current Turn: ${combatState.initiative_order[combatState.turn_index]?.name || 'Unknown'}\n\n`;

  // Show initiative order
  combatContext += '**Initiative Order:**\n';
  combatState.initiative_order.forEach((participant: any, index: number) => {
    const isCurrent = index === combatState.turn_index;
    const marker = isCurrent ? '→' : ' ';
    combatContext += `${marker} ${participant.initiative}: ${participant.name} (${participant.type})\n`;
  });

  // Show living enemies
  combatContext += '\n**Enemies:**\n';
  combatState.combatants.enemies.forEach((enemy: any) => {
    if (enemy.is_alive) {
      combatContext += `- ${enemy.name}: HP ${enemy.current_hp}/${enemy.max_hp}, AC ${enemy.ac}`;
      if (enemy.conditions && enemy.conditions.length > 0) {
        combatContext += ` [${enemy.conditions.join(', ')}]`;
      }
      combatContext += '\n';
    } else {
      combatContext += `- ${enemy.name}: ☠️ DEAD\n`;
    }
  });

  // Show player HP (they're already in the party list, but show current combat HP)
  combatContext += '\n**Players (Current HP):**\n';
  combatState.combatants.players.forEach((player: any) => {
    combatContext += `- ${player.name}: HP ${player.current_hp}/${player.max_hp}`;
    if (player.conditions && player.conditions.length > 0) {
      combatContext += ` [${player.conditions.join(', ')}]`;
    }
    combatContext += '\n';
  });

  combatContext += '\n⚠️ **IMPORTANT:** Use update_combat tool to apply damage/healing/deaths. The system tracks everything - you just narrate and use the tools!\n';

  return combatContext;
}

/**
 * Build conversation history from recent messages
 */
function buildConversationHistory(context: DMContext): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (context.recent_messages.length === 0) return [];

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Take last 15 messages to provide context without overwhelming the model
  const recentMessages = context.recent_messages.slice(-15);

  // Track initiative rolls to help Claude see all of them at once
  const initiativeRolls: { character: string; total: number }[] = [];

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

        // Track initiative rolls
        if (msg.roll_data.roll_type === 'initiative') {
          const charName = context.characters.find(c => c.id === msg.character_id)?.name || 'Player';
          initiativeRolls.push({ character: charName, total: msg.roll_data.total });
        }
      }

      history.push({
        role: 'user',
        content,
      });
    }
  });

  // If we have multiple initiative rolls, add a summary at the end
  if (initiativeRolls.length >= 2) {
    const summary = `\n[INITIATIVE SUMMARY: ${initiativeRolls.map(r => `${r.character} rolled ${r.total}`).join(', ')}]`;
    if (history.length > 0) {
      history[history.length - 1].content += summary;
    }
  }

  return history;
}

/**
 * Build the user message with current action and roll data
 */
function buildUserMessage(context: DMContext): string {
  let message = '';

  // If this is the very first message, prompt to start the adventure with immersive storytelling
  if (!context.current_player_action && !context.roll_result && context.recent_messages.length === 0) {
    return `Begin the adventure immediately with vivid, immersive storytelling! Do NOT use generic greetings like "Welcome, brave adventurers!"

Instead, dive straight into the scene:
- Describe the environment in rich detail (sights, sounds, smells)
- Set the mood and atmosphere
- Present the immediate situation or problem
- Make the players feel like they are already IN the moment

For example, for "A Most Potent Brew": Start by describing them already at the tavern, hearing Glowkindle's plea, seeing his worried face, smelling the ale and wine. Make them feel present in the scene.

Start the narrative NOW!`;
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

    // Special handling for initiative rolls
    if (context.roll_result.roll_type === 'initiative') {
      // Check if we have all player initiatives
      const playerCount = context.characters.length;
      const initiativeCount = context.recent_messages.filter(
        m => m.roll_data && m.roll_data.roll_type === 'initiative'
      ).length + 1; // +1 for current roll

      if (initiativeCount >= playerCount) {
        message += `\n⚠️ ALL INITIATIVE ROLLS RECEIVED (${initiativeCount}/${playerCount} players)\n`;
        message += `- Roll initiative for ALL enemies NOW using roll_dice\n`;
        message += `- Announce COMPLETE turn order from highest to lowest\n`;
        message += `- Then IMMEDIATELY execute ALL enemy turns before next player's turn\n`;
        message += `- DO NOT wait, DO NOT ask for more - START COMBAT NOW\n`;
      } else {
        message += `\n⚠️ INITIATIVE ROLL RECEIVED (${initiativeCount}/${playerCount} players)\n`;
        message += `- WAITING for remaining ${playerCount - initiativeCount} player(s) to roll\n`;
        message += `- Acknowledge ${context.character_name}'s roll enthusiastically\n`;
        message += `- Briefly remind other players to roll their initiative\n`;
        message += `- DO NOT roll enemy initiative yet - wait for all players first\n`;
        message += `- DO NOT start combat yet\n`;
      }
    }

    message += '\n';
  }

  // Add instructions for DM response
  if (!context.current_player_action && !context.roll_result) {
    message += 'Continue the adventure.\n';
  } else {
    message += '\nRespond dramatically.\n';
  }

  // Critical reminders - make them even stronger
  message += '\n\n🚨 MANDATORY CHECKLIST - YOU MUST DO ALL OF THESE:\n';
  message += '✓ ALWAYS include dramatic narrative text - NEVER return only tool calls or empty responses\n';
  message += '✓ Waiting for initiative? Acknowledge the roll dramatically and encourage others\n';
  message += '✓ Initiative? Request_roll from EVERY player character ONCE, then move to combat\n';
  message += '✓ After ALL initiative rolls received? Announce turn order and START combat immediately\n';
  message += '✓ Enemy attacks? ALWAYS: roll_dice attack → check AC → roll_dice damage → update_combat → next enemy\n';
  message += '✓ Multiple enemies before player turn? Complete ALL their full turns in THIS response\n';
  message += '✓ Player multi-action? Request ALL needed rolls (bonus action + main action)\n';
  message += '✓ Response MUST end with active player prompted for action/roll\n';
  message += '✓ NEVER stop after attack roll without damage\n';
  message += '✓ NEVER stop mid-round\n';
  message += '✓ NEVER re-roll initiative - it only happens once at combat start\n';
  message += '✓ NEVER return empty or silent responses - always narrate something\n';
  message += '\nFAILURE TO FOLLOW = BROKEN GAME FLOW';

  return message;
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
