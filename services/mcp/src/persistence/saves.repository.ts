import { Injectable } from '@nestjs/common';
import type { Save } from '@sleeping-giants/shared/contracts.js';

interface SaveState {
  readonly byId: Map<string, Save>;
}

@Injectable()
export class SavesRepository {
  private readonly store = new Map<string, SaveState>();

  async upsert(save: Save): Promise<Save> {
    const state = this.store.get(save.userId) ?? { byId: new Map<string, Save>() };
    state.byId.set(save.id, save);
    this.store.set(save.userId, state);
    return save;
  }

  async listByUser(userId: string): Promise<Save[]> {
    const state = this.store.get(userId);
    if (!state) {
      return [];
    }
    return Array.from(state.byId.values()).sort((a, b) =>
      b.savedAt.localeCompare(a.savedAt),
    );
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
