export class PublicDataUnavailableError extends Error {
  constructor(resource: string, options?: ErrorOptions) {
    super(`Public ${resource} data is unavailable.`, options);
    this.name = 'PublicDataUnavailableError';
  }
}

export function assertPublicDataReadAllowed({
  resource,
  seedEnabled,
  phase,
  serviceAccountJson,
}: {
  resource: string;
  seedEnabled: boolean;
  phase?: string;
  serviceAccountJson?: string;
}) {
  if (seedEnabled || phase !== 'phase-production-build' || serviceAccountJson) return;

  throw new PublicDataUnavailableError(resource, {
    cause: new Error('Remote public data reads are disabled for a credentialless production build.'),
  });
}

export async function loadPublicData<T>({
  resource,
  seedEnabled,
  seed,
  load,
}: {
  resource: string;
  seedEnabled: boolean;
  seed: T;
  load: () => Promise<T>;
}): Promise<T> {
  if (seedEnabled) return seed;

  try {
    return await load();
  } catch (cause) {
    throw new PublicDataUnavailableError(resource, { cause });
  }
}
