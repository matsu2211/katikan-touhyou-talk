
import { GoogleGenAI, Type } from "@google/genai";
import { PlayerVote } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  // HTMLタグを除去するヘルパー（ふりがな部分は中身ごと消す）
  private stripHtml(html: string): string {
    const noRtContent = html.replace(/<rt>.*?<\/rt>/g, '');
    return noRtContent.replace(/<[^>]*>?/gm, '');
  }

  async generateValueInsight(themeTitle: string, ranks: string[]): Promise<string> {
    const cleanTitle = this.stripHtml(themeTitle);
    const cleanRanks = ranks.map(r => this.stripHtml(r));

    const prompt = `
      トークゲームのファシリテーターとして振る舞ってください。
      テーマ「${cleanTitle}」に対して、ユーザーが選んだ価値観の順位は以下の通りです：
      1位：${cleanRanks[0]}
      2位：${cleanRanks[1]}
      3位：${cleanRanks[2]}

      この選択から読み取れるユーザーの価値観の傾向を短く分析し、
      さらに会話が盛り上がるような「深掘りする質問」を1つ投げかけてください。
      
      出力は以下のJSONフォーマットに従ってください：
      {
        "analysis": "分析結果の文字列（100文字程度）",
        "question": "深掘り質問の文字列（50文字程度）"
      }
    `;

    return this.fetchInsight(prompt);
  }

  async generateGroupInsight(themeTitle: string, votes: PlayerVote[]): Promise<string> {
    const cleanTitle = this.stripHtml(themeTitle);
    const votesSummary = votes.map(v => 
      `${v.playerName}: 1位[${this.stripHtml(v.ranks.rank1 || '')}], 2位[${this.stripHtml(v.ranks.rank2 || '')}], 3位[${this.stripHtml(v.ranks.rank3 || '')}]`
    ).join('\n');

    const prompt = `
      トークゲームのファシリテーターとして、グループ全体の投票結果を分析してください。
      テーマ: ${cleanTitle}
      
      各プレイヤーの回答:
      ${votesSummary}

      グループ全体の価値観の傾向（似ている点や、意外な違いなど）を面白く分析し、
      全員で話すと盛り上がる「共通の話題」や「質問」を1つ提案してください。

      出力は以下のJSONフォーマットに従ってください：
      {
        "analysis": "グループ分析結果の文字列（150文字程度）",
        "question": "全員への質問の文字列（50文字程度）"
      }
    `;

    return this.fetchInsight(prompt);
  }

  async generateGuessInsight(themeTitle: string, targetName: string, actual: string[], guess: string[]): Promise<string> {
    const cleanTitle = this.stripHtml(themeTitle);
    const cleanActual = actual.map(a => this.stripHtml(a));
    const cleanGuess = guess.map(g => this.stripHtml(g));

    const prompt = `
      価値観当てゲームのファシリテーターとして分析してください。
      テーマ: ${cleanTitle}
      対象者: ${targetName}
      本人の選択: 1位:${cleanActual[0]}, 2位:${cleanActual[1]}, 3位:${cleanActual[2]}
      みんなの予想: 1位:${cleanGuess[0]}, 2位:${cleanGuess[1]}, 3位:${cleanGuess[2]}

      予想が当たっていたかどうかに関わらず、本人の価値観の「意外性」や「みんなからのイメージ」とのギャップについて面白く分析してください。
      また、そのギャップを埋めるための面白い質問を1つ提案してください。

      出力は以下のJSONフォーマットに従ってください：
      {
        "analysis": "分析結果（150文字程度）",
        "question": "深掘り質問（50文字程度）"
      }
    `;
    return this.fetchInsight(prompt);
  }

  private async fetchInsight(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING },
              question: { type: Type.STRING },
            },
            required: ["analysis", "question"]
          }
        },
      });

      const result = JSON.parse(response.text);
      return `${result.analysis}\n\n💡 ${result.question}`;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "分析中にエラーが発生しました。みなさんで自由に結果について話し合ってみてください！";
    }
  }
}

export const geminiService = new GeminiService();
