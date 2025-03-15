import { Global, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
@Global()
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendMail(payload: {
    email: string;
    templateName: string;
    data: any;
    subject: string;
  }) {
    const { email, templateName, data, subject } = payload;
    try {
      console.log(`📩 Attempting to send email to: ${email}`);
      const templatePath = path.join(
        process.cwd(),
        'src',
        'templates',
        templateName + '.ejs',
      );
      console.log(`📝 Loading template from: ${templatePath}`);
      const html = await ejs?.renderFile(templatePath, data);

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_USER'),
        to: email,
        subject: subject,
        html,
      };
      console.log(`📤 Sending email...`);

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Email sent successfully! Response:`, result);
    } catch (error) {
      console.error(`❌ Error sending email:`, error);
    }
  }
}
