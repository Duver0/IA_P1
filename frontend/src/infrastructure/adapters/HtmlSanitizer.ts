import { InputSanitizer } from "@/domain/ports/InputSanitizer";

export class HtmlSanitizer implements InputSanitizer {
  sanitize(input: string): string {
    return input
      .replace(/[<>]/g, "")
      .replace(/script/gi, "")
      .replace(/\$[a-zA-Z]+/g, "")
      .replace(/__proto__|prototype|constructor/gi, "")
      .trim();
  }
}
