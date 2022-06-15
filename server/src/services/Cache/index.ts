import { RedisClient, createClient } from 'redis';

export interface ConnectFactoryConfig {
  readonly host?: string;
  readonly port?: number;
  readonly password?: string;
  readonly database?: string | number;
  readonly tls?: boolean;
}

export class Cache {
  static factory =
    ({ host, port, password, database, tls }: ConnectFactoryConfig, prefix: string) =>
    () =>
      new Cache(
        createClient({
          tls: tls
            ? {
                host,
                port,
              }
            : undefined,
          host,
          port,
          password,
          db: database,
        }),
        prefix,
      );

  constructor(public readonly redis: RedisClient, public readonly prefix: string) {}

  protected format(key: string) {
    return `${this.prefix}:${key}`;
  }

  get(key: string) {
    return new Promise((resolve, reject) =>
      this.redis.get(this.format(key), (err, reply) => (err ? reject(err) : resolve(reply))),
    );
  }

  set(key: string, value: string | number) {
    return new Promise((resolve, reject) =>
      this.redis.set(this.format(key), String(value), (err, reply) =>
        err ? reject(err) : resolve(reply),
      ),
    );
  }

  setex(key: string, ttl: number, value: string | number) {
    return new Promise((resolve, reject) =>
      this.redis.setex(this.format(key), ttl, String(value), (err, reply) =>
        err ? reject(err) : resolve(reply),
      ),
    );
  }

  expire(key: string, ttl: number) {
    return new Promise((resolve, reject) =>
      this.redis.expire(this.format(key), ttl, (err, reply) =>
        err ? reject(err) : resolve(reply),
      ),
    );
  }
}
