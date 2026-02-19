export type NormalizedPaymentStatus = "paid" | "pending" | "failed" | "void" | "unknown";

export function normalizeWhopPaymentStatus(rawStatus: unknown): NormalizedPaymentStatus {
  const value = String(rawStatus ?? "").toLowerCase();

  if (value === "paid" || value === "succeeded") {
    return "paid";
  }

  if (
    value === "pending" ||
    value === "open" ||
    value === "draft" ||
    value === "requires_action" ||
    value === "processing"
  ) {
    return "pending";
  }

  if (value === "void" || value === "canceled") {
    return "void";
  }

  if (value === "failed" || value === "uncollectible" || value === "unresolved") {
    return "failed";
  }

  return "unknown";
}

export function extractWhopPaymentStatus(payment: unknown): NormalizedPaymentStatus {
  const obj = payment as { status?: unknown; substatus?: unknown };

  const direct = normalizeWhopPaymentStatus(obj?.status);
  if (direct !== "unknown") {
    return direct;
  }

  const nested = obj?.status as { status?: unknown; value?: unknown } | undefined;
  const nestedStatus = normalizeWhopPaymentStatus(nested?.status ?? nested?.value);
  if (nestedStatus !== "unknown") {
    return nestedStatus;
  }

  return normalizeWhopPaymentStatus(obj?.substatus);
}

export function getWhopPaymentId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const directId = record.id;
  if (typeof directId === "string" && directId.startsWith("pay_")) {
    return directId;
  }

  const payment = record.payment as Record<string, unknown> | undefined;
  if (payment && typeof payment.id === "string" && payment.id.startsWith("pay_")) {
    return payment.id;
  }

  const data = record.data as Record<string, unknown> | undefined;
  if (data) {
    if (typeof data.id === "string" && data.id.startsWith("pay_")) {
      return data.id;
    }

    const object = data.object as Record<string, unknown> | undefined;
    if (object && typeof object.id === "string" && object.id.startsWith("pay_")) {
      return object.id;
    }
  }

  return null;
}

export function getWhopCheckoutConfigurationIdFromPayment(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const directCheckoutId = record.checkout_configuration_id;
  if (typeof directCheckoutId === "string" && directCheckoutId.startsWith("ch_")) {
    return directCheckoutId;
  }

  const directCheckoutIdAlt = record.checkoutConfigurationId;
  if (typeof directCheckoutIdAlt === "string" && directCheckoutIdAlt.startsWith("ch_")) {
    return directCheckoutIdAlt;
  }

  const payment = record.payment as Record<string, unknown> | undefined;
  const paymentCheckoutId = payment?.checkout_configuration_id;
  if (typeof paymentCheckoutId === "string" && paymentCheckoutId.startsWith("ch_")) {
    return paymentCheckoutId;
  }

  const paymentCheckoutIdAlt = payment?.checkoutConfigurationId;
  if (typeof paymentCheckoutIdAlt === "string" && paymentCheckoutIdAlt.startsWith("ch_")) {
    return paymentCheckoutIdAlt;
  }

  const data = record.data as Record<string, unknown> | undefined;
  const dataCheckoutId = data?.checkout_configuration_id;
  if (typeof dataCheckoutId === "string" && dataCheckoutId.startsWith("ch_")) {
    return dataCheckoutId;
  }

  const dataCheckoutIdAlt = data?.checkoutConfigurationId;
  if (typeof dataCheckoutIdAlt === "string" && dataCheckoutIdAlt.startsWith("ch_")) {
    return dataCheckoutIdAlt;
  }

  const object = data?.object as Record<string, unknown> | undefined;
  const objectCheckoutId = object?.checkout_configuration_id;
  if (typeof objectCheckoutId === "string" && objectCheckoutId.startsWith("ch_")) {
    return objectCheckoutId;
  }

  const objectCheckoutIdAlt = object?.checkoutConfigurationId;
  if (typeof objectCheckoutIdAlt === "string" && objectCheckoutIdAlt.startsWith("ch_")) {
    return objectCheckoutIdAlt;
  }

  return null;
}

export function getSubmissionCheckoutContextIdFromPayment(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const metadata = record.metadata as Record<string, unknown> | undefined;
  const fromMetadata = metadata?.checkoutConfigurationId;
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return fromMetadata;
  }

  const payment = record.payment as Record<string, unknown> | undefined;
  const paymentMetadata = payment?.metadata as Record<string, unknown> | undefined;
  const fromPaymentMetadata = paymentMetadata?.checkoutConfigurationId;
  if (typeof fromPaymentMetadata === "string" && fromPaymentMetadata.length > 0) {
    return fromPaymentMetadata;
  }

  const data = record.data as Record<string, unknown> | undefined;
  const dataMetadata = data?.metadata as Record<string, unknown> | undefined;
  const fromDataMetadata = dataMetadata?.checkoutConfigurationId;
  if (typeof fromDataMetadata === "string" && fromDataMetadata.length > 0) {
    return fromDataMetadata;
  }

  const object = data?.object as Record<string, unknown> | undefined;
  const objectMetadata = object?.metadata as Record<string, unknown> | undefined;
  const fromObjectMetadata = objectMetadata?.checkoutConfigurationId;
  if (typeof fromObjectMetadata === "string" && fromObjectMetadata.length > 0) {
    return fromObjectMetadata;
  }

  return null;
}

export function getSubmissionPaymentIdFromPayment(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const metadata = record.metadata as Record<string, unknown> | undefined;
  const fromMetadata = metadata?.submissionPaymentId;
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return fromMetadata;
  }

  const payment = record.payment as Record<string, unknown> | undefined;
  const paymentMetadata = payment?.metadata as Record<string, unknown> | undefined;
  const fromPaymentMetadata = paymentMetadata?.submissionPaymentId;
  if (typeof fromPaymentMetadata === "string" && fromPaymentMetadata.length > 0) {
    return fromPaymentMetadata;
  }

  const data = record.data as Record<string, unknown> | undefined;
  const dataMetadata = data?.metadata as Record<string, unknown> | undefined;
  const fromDataMetadata = dataMetadata?.submissionPaymentId;
  if (typeof fromDataMetadata === "string" && fromDataMetadata.length > 0) {
    return fromDataMetadata;
  }

  const object = data?.object as Record<string, unknown> | undefined;
  const objectMetadata = object?.metadata as Record<string, unknown> | undefined;
  const fromObjectMetadata = objectMetadata?.submissionPaymentId;
  if (typeof fromObjectMetadata === "string" && fromObjectMetadata.length > 0) {
    return fromObjectMetadata;
  }

  return null;
}

export async function firstItemFromAsyncIterable<T>(
  iterable: AsyncIterable<T>,
): Promise<T | null> {
  for await (const item of iterable) {
    return item;
  }

  return null;
}
