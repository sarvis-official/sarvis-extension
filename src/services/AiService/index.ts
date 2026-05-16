export { post, stripThinkTags } from './ai.base';
export { AiCodeService } from './ai.code';
export { AiReviewService } from './ai.review';
export { AiAnalysisService } from './ai.analysis';
export { AiGitService } from './ai.git';
export { AiDocsService } from './ai.docs';
export { AiDebugService } from './ai.debug';
export { AiProjectService } from './ai.project';

import { AiCodeService } from './ai.code';
import { AiReviewService } from './ai.review';
import { AiAnalysisService } from './ai.analysis';
import { AiGitService } from './ai.git';
import { AiDocsService } from './ai.docs';
import { AiDebugService } from './ai.debug';
import { AiProjectService } from './ai.project';

export const AiService = {
    // --- code ---
    completeInline:         AiCodeService.completeInline,
    generateFromPrompt:     AiCodeService.generateFromPrompt,
    generateFromTemplate:   AiCodeService.generateFromTemplate,
    editCodeWithPrompt:     AiCodeService.editCodeWithPrompt,
    refactorSingleFile:     AiCodeService.refactorSingleFile,
    migrateCode:            AiCodeService.migrateCode,
    explainCode:            AiCodeService.explainCode,
    addJsDocComments:       AiCodeService.addJsDocComments,
    improveCode:            AiCodeService.improveCode,
    generateSmartSnippet:   AiCodeService.generateSmartSnippet,
    pairProgrammer:         AiCodeService.pairProgrammer,
    generateTests:          AiCodeService.generateTests,

    // --- review ---
    reviewFile:             AiReviewService.reviewFile,
    reviewDiff:             AiReviewService.reviewDiff,
    reviewDiffCode:         AiReviewService.reviewDiffCode,
    reviewPR:               AiReviewService.reviewPR,
    detectRiskyChanges:     AiReviewService.detectRiskyChanges,
    quickReviewOnSave:      AiReviewService.quickReviewOnSave,

    // --- analysis ---
    scanSecurity:           AiAnalysisService.scanSecurity,
    analyzePerformance:     AiAnalysisService.analyzePerformance,
    analyzePerformanceProject: AiAnalysisService.analyzePerformanceProject,
    analyzeComplexity:      AiAnalysisService.analyzeComplexity,
    analyzeCodeSmells:      AiAnalysisService.analyzeCodeSmells,
    findDeadCode:           AiAnalysisService.findDeadCode,
    analyzeDependencies:    AiAnalysisService.analyzeDependencies,

    // --- git ---
    generateCommitMessage:  AiGitService.generateCommitMessage,
    summarizeChanges:       AiGitService.summarizeChanges,
    generateChangelog:      AiGitService.generateChangelog,
    generateStandup:        AiGitService.generateStandup,
    generatePullRequest:    AiGitService.generatePullRequest,

    // --- docs ---
    generateReadme:         AiDocsService.generateReadme,
    generateSwaggerDocs:    AiDocsService.generateSwaggerDocs,
    generateApiDocs:        AiDocsService.generateApiDocs,

    // --- debug ---
    debugError:             AiDebugService.debugError,
    explainError:           AiDebugService.explainError,
    analyzeTerminalError:   AiDebugService.analyzeTerminalError,
    generateTerminalCommand: AiDebugService.generateTerminalCommand,
    fixDiagnostics:         AiDebugService.fixDiagnostics,
    fixFailingTests:        AiDebugService.fixFailingTests,
    findRootCause:          AiDebugService.findRootCause,

    // --- project ---
    chat:                   AiProjectService.chat,
    codebaseQA:             AiProjectService.codebaseQA,
    generateHealthSummary:  AiProjectService.generateHealthSummary,
    analyzeTodos:           AiProjectService.analyzeTodos,
    generateArchitectureDiagram: AiProjectService.generateArchitectureDiagram,
    generateArchitecture:   AiProjectService.generateArchitecture,
    planRefactor:           AiProjectService.planRefactor,
};
