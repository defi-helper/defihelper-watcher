import { EventListener, eventListenerTableName } from '@models/Contract/Entity';
import container from '@container';

interface EventListenerSync extends EventListener {
  syncHeight: number;
}

export default async () => {
  const interaction = container.model.interactionService();
  const eventListeners = await container.database()<EventListenerSync>(eventListenerTableName);
  await eventListeners.reduce(async (prev, eventListener) => {
    await prev;
    interaction.createHistorySync(eventListener, eventListener.syncHeight);

    return null;
  }, Promise.resolve(null));
};
