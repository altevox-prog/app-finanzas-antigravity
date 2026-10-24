export interface ExtractedTransaction {
  amount: number;
  description: string;
  date: string;
  account_type: string;
  destination_account_type?: string;
  type?: "income" | "expense" | "transfer";
}

export interface AccountRecord {
  id: string;
  name: string;
  type: string;
}

export interface WebhookRequest {
  userId?: string;
  user_id?: string;
  email_body?: string;
  emailText?: string;
  body?: string;
  email_message_id?: string;
  messageId?: string;
  account_id?: string;
  accountId?: string;
}
