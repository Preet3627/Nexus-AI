import AppKit
import Foundation
import PDFKit
import Vision
import ImageIO

struct ExtractionResponse: Codable {
    let text: String
    let extractor: String
    let metadata: [String: String]
}

enum NativeExtractorError: LocalizedError {
    case invalidArguments
    case unreadablePDF
    case unreadableImage
    case noImageData

    var errorDescription: String? {
        switch self {
        case .invalidArguments:
            return "Provide a local file path to the native extractor."
        case .unreadablePDF:
            return "PDFKit could not read the PDF file."
        case .unreadableImage:
            return "Vision could not load the image for OCR."
        case .noImageData:
            return "The image did not contain a readable CGImage."
        }
    }
}

func extractPDF(from url: URL) throws -> ExtractionResponse {
    guard let document = PDFDocument(url: url) else {
        throw NativeExtractorError.unreadablePDF
    }

    var pages: [String] = []
    for index in 0..<document.pageCount {
        if let text = document.page(at: index)?.string?.trimmingCharacters(in: .whitespacesAndNewlines),
           !text.isEmpty {
            pages.append(text)
        }
    }

    return ExtractionResponse(
        text: pages.joined(separator: "\n\n"),
        extractor: "pdfkit",
        metadata: ["pages": String(document.pageCount)]
    )
}

func extractImageText(from url: URL) throws -> ExtractionResponse {
    guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else {
        throw NativeExtractorError.unreadableImage
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: image)
    try handler.perform([request])

    let observations = request.results ?? []
    let lines = observations.compactMap { observation in
        observation.topCandidates(1).first?.string
    }

    return ExtractionResponse(
        text: lines.joined(separator: "\n"),
        extractor: "vision-ocr",
        metadata: ["observations": String(observations.count)]
    )
}

func printResponse(_ response: ExtractionResponse) throws {
    let data = try JSONEncoder().encode(response)
    FileHandle.standardOutput.write(data)
}

do {
    guard CommandLine.arguments.count >= 2 else {
        throw NativeExtractorError.invalidArguments
    }

    let url = URL(fileURLWithPath: CommandLine.arguments[1])
    let fileExtension = url.pathExtension.lowercased()

    let response: ExtractionResponse
    switch fileExtension {
    case "pdf":
        response = try extractPDF(from: url)
    default:
        response = try extractImageText(from: url)
    }

    try printResponse(response)
} catch {
    FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
    exit(1)
}
