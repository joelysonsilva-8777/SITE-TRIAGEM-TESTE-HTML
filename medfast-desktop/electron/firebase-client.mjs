export class CloudError extends Error {
  constructor(message, status = 0, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number')
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}
export function encodeFields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, encodeValue(item)]),
  );
}
export function decodeValue(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value)
    return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  throw new Error('Campo remoto não suportado.');
}
export function decodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [
      key,
      decodeValue(value),
    ]),
  );
}
export class FirebaseClient {
  constructor(config, database, { fetcher = fetch, emulator = null } = {}) {
    this.config = config;
    this.local = database;
    this.fetcher = fetcher;
    this.session = database.getMeta('session');
    this.emulator = emulator;
    if (
      emulator &&
      (!/^127\.0\.0\.1:\d+$/.test(emulator.firestore) ||
        !/^127\.0\.0\.1:\d+$/.test(emulator.auth))
    )
      throw new Error('Emulador deve usar loopback.');
    const firestoreHost = emulator
      ? `http://${emulator.firestore}`
      : 'https://firestore.googleapis.com';
    this.root = `projects/${config.projectId}/databases/(default)/documents`;
    this.base = `${firestoreHost}/v1/${this.root}`;
    this.unit = `units/${config.unitId}`;
  }
  async request(
    url,
    {
      method = 'GET',
      body,
      authenticated = true,
      allow404 = false,
      headers = {},
    } = {},
  ) {
    let response;
    try {
      response = await this.fetcher(url, {
        method,
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          ...(authenticated
            ? { Authorization: `Bearer ${await this.token()}` }
            : {}),
          ...headers,
        },
        ...(body === undefined
          ? {}
          : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
      });
    } catch (error) {
      if (error instanceof CloudError) throw error;
      throw new CloudError(
        'Sem comunicação com o Firebase. Os dados continuam salvos neste computador.',
      );
    }
    if (response.status === 404 && allow404) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = data.error?.status || data.error?.message || '';
      const authErrors = [
        'INVALID_LOGIN_CREDENTIALS',
        'INVALID_PASSWORD',
        'EMAIL_NOT_FOUND',
        'USER_DISABLED',
        'INVALID_REFRESH_TOKEN',
        'TOKEN_EXPIRED',
      ];
      let message =
        response.status === 403
          ? 'Acesso negado. Confira a autorização da unidade e as regras do Firebase.'
          : 'O Firebase não aceitou a operação. Os dados permanecem na fila local.';
      if (authErrors.some((value) => code.includes(value)))
        message =
          'E-mail ou senha inválidos, ou sessão expirada. Entre novamente.';
      if (
        code.includes('CONFIGURATION_NOT_FOUND') ||
        code.includes('OPERATION_NOT_ALLOWED')
      )
        message =
          'Ative o login por e-mail e senha no Firebase Authentication.';
      if (response.status === 404)
        message =
          'Banco ou unidade não encontrados. Confira a configuração do Firestore.';
      throw new CloudError(message, response.status, code);
    }
    return data;
  }
  authUrl(operation, token = false) {
    const host = token
      ? 'securetoken.googleapis.com'
      : 'identitytoolkit.googleapis.com';
    return `${this.emulator ? `http://${this.emulator.auth}/${host}` : `https://${host}`}/v1/${operation}?key=${encodeURIComponent(this.config.apiKey)}`;
  }
  saveSession(session) {
    this.session = session;
    this.local.setMeta('session', session);
  }
  async login(email, password) {
    if (
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      !password
    )
      throw new Error('Informe o e-mail e a senha.');
    const data = await this.request(
      this.authUrl('accounts:signInWithPassword'),
      {
        method: 'POST',
        body: { email, password, returnSecureToken: true },
        authenticated: false,
      },
    );
    this.saveSession({
      uid: data.localId,
      email: data.email,
      token: data.idToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + Number(data.expiresIn) * 1000,
      role: null,
    });
    return this.authorize();
  }
  async token() {
    if (!this.session)
      throw new CloudError('Entre na sua conta para sincronizar.', 401);
    if (this.session.expiresAt > Date.now() + 60000) return this.session.token;
    const data = await this.request(this.authUrl('token', true), {
      method: 'POST',
      authenticated: false,
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.session.refreshToken,
      }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    this.saveSession({
      ...this.session,
      token: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + Number(data.expires_in) * 1000,
    });
    return this.session.token;
  }
  async authorize() {
    const binding = this.local.getMeta('binding');
    if (
      binding &&
      (binding.projectId !== this.config.projectId ||
        binding.unitId !== this.config.unitId)
    )
      throw new CloudError(
        'Este banco local pertence a outro projeto ou unidade. Não será enviado.',
        403,
      );
    const member = await this.getDocument(
      `${this.unit}/members/${this.session.uid}`,
    );
    const data = member ? decodeFields(member.fields) : null;
    if (
      !data ||
      data.active !== true ||
      !['admin', 'editor', 'viewer'].includes(data.role)
    ) {
      this.saveSession({ ...this.session, role: 'blocked' });
      throw new CloudError(
        'Conta sem autorização nesta unidade. Cadastre o UID como membro ativo no Firebase.',
        403,
      );
    }
    this.saveSession({ ...this.session, role: data.role });
    if (!binding)
      this.local.setMeta('binding', {
        projectId: this.config.projectId,
        unitId: this.config.unitId,
      });
    return {
      uid: this.session.uid,
      email: this.session.email,
      role: this.session.role,
    };
  }
  getDocument(path) {
    return this.request(`${this.base}/${path}`, { allow404: true });
  }
  async send(operation, deviceId) {
    const opPath = `${this.unit}/operations/${operation.opId}`;
    const known = await this.getDocument(opPath);
    if (known) {
      const old = decodeFields(known.fields);
      if (old.key !== operation.key)
        throw new CloudError('Identificador de envio incompatível.', 409);
      return { version: old.version };
    }
    const path = `${this.unit}/records/${operation.key}`;
    const document = await this.getDocument(path);
    const remote = document ? decodeFields(document.fields) : null;
    if ((remote?.version || 0) !== operation.baseVersion)
      return { conflict: remote };
    const version = operation.baseVersion + 1;
    const record = {
      schema: 1,
      kind: operation.kind,
      id: operation.id,
      payload: operation.payload,
      version,
      updatedBy: this.session.uid,
      deviceId,
      opId: operation.opId,
    };
    const audit = {
      key: operation.key,
      kind: operation.kind,
      id: operation.id,
      baseVersion: operation.baseVersion,
      version,
      uid: this.session.uid,
      deviceId,
    };
    try {
      await this.request(`${this.base}:commit`, {
        method: 'POST',
        body: {
          writes: [
            {
              update: {
                name: `${this.root}/${path}`,
                fields: encodeFields(record),
              },
              currentDocument: document
                ? { updateTime: document.updateTime }
                : { exists: false },
              updateTransforms: [
                { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
              ],
            },
            {
              update: {
                name: `${this.root}/${opPath}`,
                fields: encodeFields(audit),
              },
              currentDocument: { exists: false },
              updateTransforms: [
                { fieldPath: 'at', setToServerValue: 'REQUEST_TIME' },
              ],
            },
          ],
        },
      });
      return { version };
    } catch (error) {
      if (
        [409, 412].includes(error.status) ||
        ['FAILED_PRECONDITION', 'ALREADY_EXISTS', 'ABORTED'].includes(
          error.code,
        )
      ) {
        const committed = await this.getDocument(opPath);
        if (committed)
          return { version: decodeFields(committed.fields).version };
        const latest = await this.getDocument(path);
        if (latest) return { conflict: decodeFields(latest.fields) };
      }
      throw error;
    }
  }
  async pull() {
    const records = [];
    let token = '';
    do {
      const result = await this.request(
        `${this.base}/${this.unit}/records?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`,
      );
      for (const doc of result.documents || [])
        records.push(decodeFields(doc.fields));
      token = result.nextPageToken || '';
      if (records.length > 70000)
        throw new CloudError(
          'Volume remoto acima do limite desta versão. Entre em contato com o administrador.',
        );
    } while (token);
    return records;
  }
  logout() {
    this.saveSession(null);
  }
  publicSession() {
    return this.session
      ? {
          uid: this.session.uid,
          email: this.session.email,
          role: this.session.role,
        }
      : null;
  }
}
