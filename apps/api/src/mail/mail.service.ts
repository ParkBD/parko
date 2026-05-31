import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  bookingConfirmationEmail,
  securityAlertEmail,
  type BookingConfirmationData,
  type SecurityAlertData,
} from './templates/email.templates';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private from: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.from = this.config.get<string>('mail.from') ?? 'ParkNest <noreply@parknest.com>';
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('mail.host'),
      port: this.config.get<number>('mail.port'),
      secure: this.config.get<number>('mail.port') === 465,
      auth: {
        user: this.config.get<string>('mail.user'),
        pass: this.config.get<string>('mail.pass'),
      },
    });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
      // Non-fatal — booking flow continues even if email fails
    }
  }

  async sendBookingConfirmation(to: string, data: BookingConfirmationData): Promise<void> {
    const { subject, html } = bookingConfirmationEmail(data);
    await this.send(to, subject, html);
  }

  async sendSecurityAlert(to: string, data: SecurityAlertData): Promise<void> {
    const { subject, html } = securityAlertEmail(data);
    await this.send(to, subject, html);
  }
}
