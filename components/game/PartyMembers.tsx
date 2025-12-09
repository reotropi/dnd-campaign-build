'use client';

import { Card, Text, Stack, Group, Badge } from '@mantine/core';
import { SessionMemberWithDetails } from '@/types';

interface PartyMembersProps {
  members: SessionMemberWithDetails[];
}

export function PartyMembers({ members }: PartyMembersProps) {
  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <Text fw={700} size="lg">
          Party Members
        </Text>

        <Stack gap="sm">
          {members.map((member) => (
            <Card key={member.id} withBorder padding="sm">
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{member.character?.name || 'No Character'}</Text>
                  <Text size="sm" c="dimmed">
                    {member.profile?.player_name || 'Unknown Player'}
                  </Text>
                </div>
                {member.character && (
                  <div style={{ textAlign: 'right' }}>
                    <Badge variant="outline" mb={4}>
                      {member.character.class} {member.character.level}
                    </Badge>
                    <Text size="sm" c="dimmed">
                      AC {member.character.armor_class}
                    </Text>
                  </div>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
