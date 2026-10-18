import { DeliveryChannel } from "@notification/database";
import { ChannelAdapter, SendPayload, SendResult } from "./channel-adapter.interface.js";
import nodemailer, { Transporter } from "nodemailer";
import { config } from "../../../config/index.js";
import { logger } from "../../../config/logger.js";

export class EmailAdapter implements ChannelAdapter{
  readonly channel: DeliveryChannel = "EMAIL";
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter{
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure:false
      })
    }
    return this.transporter
  }
  async send(payload: SendPayload): Promise<SendResult> {
    const to = payload.toEmail ?? `${payload.userId}@example.com`;
    if (!config.EMAIL_ENABLED) {
          logger.info("EmailAdapter: EMAIL_ENABLED=false – skipping real send", {
            notificationId: payload.notificationId,
            to,
            title: payload.title,
          });
          return { providerMessageId: `console-${Date.now()}` };
    }
    const transporter = this.getTransporter();
    const info = await transporter.sendMail({
      from: config.SMTP_FROM,
      to,
      subject: payload.title,
      text: payload.body,
      html: `<p>${payload.body}</p>`,
            // optional: headers for correlation
            headers: {
              "X-Notification-Id": payload.notificationId,
            },
    })
    logger.info("EmailAdapter: message sent", {
          notificationId: payload.notificationId,
          to,
          messageId: info.messageId,
        });
    
        return { providerMessageId: info.messageId };
  }
}