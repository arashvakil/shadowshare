export interface AmneziaWgPeer {
  id: string;       // Client public key (used as peer identifier for awg set/remove)
  name: string;
  client_ip: string;
  client_public_key: string;
  status: string;
  server_id: string;
  server_name: string;
  created_at: number;
}

export interface AmneziaWgCreateResponse {
  client: AmneziaWgPeer;
  config: string;   // Raw .conf text for the client
}
