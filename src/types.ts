/**
 * This file contains the typescript interfaces for the plugin events.
 */

interface MessageData {
  [key: string]: string;
}
export interface PluginMessageEvent {
  type: string;
  content?: string;
  data?: MessageData;
}
