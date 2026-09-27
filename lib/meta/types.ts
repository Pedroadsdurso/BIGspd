export type MetaConnectionResult = {
  connected: boolean;
  wabaFound: boolean;
  phoneFound: boolean;
  apiAccessible: boolean;
  businessName?: string;
  displayPhoneNumber?: string;
};

export type MetaPhoneNumber = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  status?: string;
};

export type MetaTemplate = {
  id?: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown[];
};

export type SendTemplateInput = {
  to: string;
  templateName: string;
  language: string;
  bodyParameters: string[];
};

export interface MetaWhatsAppClient {
  getBusinessAccount(): Promise<{ id: string; name?: string }>;
  getPhoneNumbers(): Promise<MetaPhoneNumber[]>;
  getTemplates(): Promise<MetaTemplate[]>;
  sendTemplateMessage(input: SendTemplateInput): Promise<{ messageId: string }>;
  sendTextMessage(input: { to: string; text: string; previewUrl?: boolean }): Promise<{ messageId: string }>;
  getMessageStatus(messageId: string): Promise<{ status: "WEBHOOK_REQUIRED"; messageId: string }>;
  testConnection(): Promise<MetaConnectionResult>;
}

export type MetaClientConfig = {
  apiVersion: string;
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
};
