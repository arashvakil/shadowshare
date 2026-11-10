export interface MarzbanToken {
  access_token: string;
  token_type: string;
}

export interface MarzbanUser {
  username: string;
  status: "active" | "disabled" | "limited" | "expired";
  used_traffic: number;
  lifetime_used_traffic: number;
  data_limit: number | null;
  expire: number | null;
  online_at: string | null;
  sub_last_user_agent: string | null;
  subscription_url: string;
  links: string[];
  created_at: string;
}

export interface MarzbanUsersResponse {
  users: MarzbanUser[];
  total: number;
}

export interface MarzbanSystemStats {
  version: string;
  mem_total: number;
  mem_used: number;
  cpu_cores: number;
  cpu_usage: number;
  total_user: number;
  users_active: number;
  incoming_bandwidth: number;
  outgoing_bandwidth: number;
}
