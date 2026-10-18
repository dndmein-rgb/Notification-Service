export enum NotificationStatus {
  
  PENDING = "PENDING",
  DELIVERED = "DELIVERED",
  PARTIAL="PARTIAL",
  FAILED="FAILED"
}

export enum DeliveryChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
}

export enum DeliveryStatus{
  QUEUED = "QUEUED",
  SENDING = "SENDING",
  SENT = "SENT",
  
  FAILED = "FAILED",
  DEAD="DEAD"
}
