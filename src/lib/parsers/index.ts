import type { DocumentParser, StockImageParser } from "./types";
import { MockDocumentParser, MockStockImageParser } from "./mock-parser";

export type { DocumentParser, StockImageParser } from "./types";
export type {
  DeliveryNoteParsed,
  DeliveryNoteItemParsed,
  StockImageParsed,
  StockItemParsed,
} from "./types";

function getProvider(): string {
  return process.env.DOCUMENT_PARSER_PROVIDER || "mock";
}

export function getDocumentParser(): DocumentParser {
  const provider = getProvider();

  switch (provider) {
    case "anthropic": {
      const { AnthropicDocumentParser } = require("./anthropic-parser");
      return new AnthropicDocumentParser();
    }
    case "openai": {
      const { OpenAIDocumentParser } = require("./openai-parser");
      return new OpenAIDocumentParser();
    }
    case "mock":
    default:
      return new MockDocumentParser();
  }
}

export function getStockImageParser(): StockImageParser {
  const provider = getProvider();

  switch (provider) {
    case "anthropic": {
      const { AnthropicStockImageParser } = require("./anthropic-parser");
      return new AnthropicStockImageParser();
    }
    case "openai": {
      const { OpenAIStockImageParser } = require("./openai-parser");
      return new OpenAIStockImageParser();
    }
    case "mock":
    default:
      return new MockStockImageParser();
  }
}
