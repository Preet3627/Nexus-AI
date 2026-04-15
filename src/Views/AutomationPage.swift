import SwiftUI

struct AutomationPage: View {
    @Binding var theme: NexusTheme
    @StateObject private var viewModel = AutomationViewModel()
    @State private var showingAddTask = false
    @State private var selectedTask: AutomationTask?
    @State private var showingTaskEditor = false

    var body: some View {
        TranslucentPanel(theme: theme) {
            VStack(spacing: 0) {
                header
                content
            }
        }
        .sheet(isPresented: $showingAddTask) {
            TaskEditorSheet(
                task: nil,
                theme: theme,
                onSave: { task in
                    viewModel.addTask(task)
                    showingAddTask = false
                }
            )
        }
        .sheet(item: $selectedTask) { task in
            TaskEditorSheet(
                task: task,
                theme: theme,
                onSave: { updatedTask in
                    viewModel.updateTask(updatedTask)
                    selectedTask = nil
                }
            )
        }
    }

    @ViewBuilder
    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Automations")
                    .font(.title2.weight(.semibold))
                Text("\(viewModel.tasks.count) tasks")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack(spacing: 12) {
                Button {
                    viewModel.runAllDueTasks()
                } label: {
                    Label("Run Now", systemImage: "play.fill")
                }
                .buttonStyle(.borderedProminent)

                Button {
                    showingAddTask = true
                } label: {
                    Label("Add Task", systemImage: "plus")
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private var content: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if viewModel.tasks.isEmpty {
                    emptyState
                } else {
                    ForEach(viewModel.tasks) { task in
                        TaskCard(
                            task: task,
                            theme: theme,
                            onToggle: { viewModel.toggleTask(task) },
                            onRun: { viewModel.runTask(task) },
                            onEdit: { selectedTask = task },
                            onDelete: { viewModel.deleteTask(task) }
                        )
                    }
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        VStack(spacing: 20) {
            GlassmorphicIcon(icon: "clock.badge.checkmark", theme: theme, size: 60)

            Text("No Automations")
                .font(.title3.weight(.semibold))

            Text("Create automated tasks that run on a schedule")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                showingAddTask = true
            } label: {
                Label("Create Your First Automation", systemImage: "plus.circle.fill")
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(40)
    }
}

struct TaskCard: View {
    let task: AutomationTask
    let theme: NexusTheme
    let onToggle: () -> Void
    let onRun: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            mainRow
            if isExpanded {
                detailsRow
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(task.enabled ? theme.primaryColor.opacity(0.3) : Color.clear, lineWidth: 1)
                )
        )
    }

    @ViewBuilder
    private var mainRow: some View {
        HStack(spacing: 12) {
            statusIndicator

            VStack(alignment: .leading, spacing: 4) {
                Text(task.name)
                    .font(.headline)
                    .foregroundStyle(task.enabled ? .primary : .secondary)

                Text(task.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            scheduleBadge

            HStack(spacing: 8) {
                Button(action: onRun) {
                    Image(systemName: "play.circle")
                        .font(.system(size: 20))
                        .foregroundStyle(.green)
                }
                .buttonStyle(.plain)

                Button(action: onEdit) {
                    Image(systemName: "pencil.circle")
                        .font(.system(size: 20))
                        .foregroundStyle(.blue)
                }
                .buttonStyle(.plain)

                Toggle("", isOn: Binding(
                    get: { task.enabled },
                    set: { _ in onToggle() }
                ))
                .toggleStyle(.switch)
                .labelsHidden()
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.spring(response: 0.3)) {
                isExpanded.toggle()
            }
        }
    }

    @ViewBuilder
    private var statusIndicator: some View {
        ZStack {
            Circle()
                .fill(task.enabled ? theme.primaryColor.gradient : LinearGradient(colors: [.gray], startPoint: .top, endPoint: .bottom))
                .frame(width: 12, height: 12)

            if viewModel.isRunning(task) {
                Circle()
                    .stroke(theme.primaryColor.opacity(0.5), lineWidth: 2)
                    .frame(width: 20, height: 20)
                    .modifier(PulseAnimation())
            }
        }
    }

    @ViewBuilder
    private var scheduleBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock")
                .font(.caption2)
            Text(task.cron_expression)
                .font(.system(.caption2, design: .monospaced))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(.quaternary)
        )
    }

    @ViewBuilder
    private var detailsRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            Divider()

            HStack {
                commandInfo
                Spacer()
                statsInfo
            }

            if let lastRun = task.lastRun {
                Text("Last run: \(lastRun, style: .relative) ago")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var commandInfo: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Command")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(commandDescription)
                .font(.caption)
                .foregroundStyle(.primary)
        }
    }

    @ViewBuilder
    private var statsInfo: some View {
        HStack(spacing: 16) {
            VStack(alignment: .center, spacing: 2) {
                Text("\(task.runCount)")
                    .font(.caption.weight(.semibold))
                Text("Runs")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .center, spacing: 2) {
                Text("\(task.successCount)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.green)
                Text("Success")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .center, spacing: 2) {
                Text("\(task.failureCount)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.red)
                Text("Failed")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var commandDescription: String {
        switch task.command {
        case .aiPrompt(let prompt, _):
            return "AI: \(prompt.prefix(50))..."
        case .shell(let command, _):
            return "Shell: \(command.prefix(50))..."
        case .httpRequest(let url, _, _, _):
            return "HTTP: \(url)"
        case .notification(let title, _, _):
            return "Notification: \(title)"
        case .workflow(let id, _):
            return "Workflow: \(id)"
        }
    }
}

struct PulseAnimation: ViewModifier {
    @State private var isPulsing = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing ? 1.5 : 1)
            .opacity(isPulsing ? 0 : 1)
            .onAppear {
                withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: false)) {
                    isPulsing = true
                }
            }
    }
}

struct TaskEditorSheet: View {
    let task: AutomationTask?
    let theme: NexusTheme
    let onSave: (AutomationTask) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var description: String = ""
    @State private var cronExpression: String = "0 * * * *"
    @State private var selectedCommandType: CommandType = .aiPrompt
    @State private var aiPrompt: String = ""
    @State private var shellCommand: String = ""
    @State private var notificationTitle: String = ""
    @State private var notificationBody: String = ""
    @State private var enabled: Bool = true

    enum CommandType: String, CaseIterable {
        case aiPrompt = "AI Prompt"
        case shell = "Shell Command"
        case notification = "Notification"
        case httpRequest = "HTTP Request"
        case workflow = "Workflow"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    TextField("Name", text: $name)
                    TextField("Description", text: $description)
                }

                Section("Schedule") {
                    CronPresetPicker(selection: $cronExpression)
                    TextField("Cron Expression", text: $cronExpression)
                        .font(.system(.body, design: .monospaced))
                }

                Section("Command") {
                    Picker("Type", selection: $selectedCommandType) {
                        ForEach(CommandType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }

                    commandFields
                }

                Section {
                    Toggle("Enabled", isOn: $enabled)
                }
            }
            .navigationTitle(task == nil ? "New Automation" : "Edit Automation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { saveTask() }
                        .disabled(name.isEmpty || cronExpression.isEmpty)
                }
            }
        }
        .onAppear {
            if let task = task {
                name = task.name
                description = task.description
                cronExpression = task.cronExpression
                enabled = task.enabled
            }
        }
    }

    @ViewBuilder
    private var commandFields: some View {
        switch selectedCommandType {
        case .aiPrompt:
            TextField("Prompt", text: $aiPrompt, axis: .vertical)
                .lineLimit(3...6)
        case .shell:
            TextField("Command", text: $shellCommand, axis: .vertical)
                .lineLimit(2...4)
                .font(.system(.body, design: .monospaced))
        case .notification:
            TextField("Title", text: $notificationTitle)
            TextField("Body", text: $notificationBody, axis: .vertical)
                .lineLimit(2...4)
        case .httpRequest:
            TextField("URL", text: .constant("https://"))
        case .workflow:
            TextField("Workflow ID", text: .constant(""))
        }
    }

    private func saveTask() {
        let command: AutomationCommand
        switch selectedCommandType {
        case .aiPrompt:
            command = .aiPrompt(prompt: aiPrompt, model: nil)
        case .shell:
            command = .shell(command: shellCommand, timeoutSecs: 300)
        case .notification:
            command = .notification(title: notificationTitle, body: notificationBody, sound: true)
        case .httpRequest:
            command = .httpRequest(url: "", method: "GET", headers: [:], body: nil)
        case .workflow:
            command = .workflow(workflowId: "", params: [:])
        }

        let newTask = AutomationTask(
            id: task?.id ?? UUID().uuidString,
            name: name,
            description: description,
            cronExpression: cronExpression,
            command: command,
            enabled: enabled,
            createdAt: task?.createdAt ?? Date(),
            lastRun: task?.lastRun,
            nextRun: task?.nextRun,
            runCount: task?.runCount ?? 0,
            successCount: task?.successCount ?? 0,
            failureCount: task?.failureCount ?? 0
        )
        onSave(newTask)
    }
}

struct CronPresetPicker: View {
    @Binding var selection: String

    private let presets = [
        ("Every minute", "* * * * *"),
        ("Every 5 min", "*/5 * * * *"),
        ("Every 15 min", "*/15 * * * *"),
        ("Every hour", "0 * * * *"),
        ("Daily midnight", "0 0 * * *"),
        ("Daily 8am", "0 8 * * *"),
        ("Weekdays 9am", "0 9 * * 1-5"),
        ("Weekly Monday", "0 9 * * 1"),
        ("Monthly 1st", "0 0 1 * *"),
    ]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(presets, id: \.1) { preset in
                    Button {
                        selection = preset.1
                    } label: {
                        Text(preset.0)
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                Capsule()
                                    .fill(selection == preset.1 ? Color.purple.opacity(0.2) : Color.clear)
                            )
                            .overlay(
                                Capsule()
                                    .stroke(selection == preset.1 ? Color.purple : Color.gray.opacity(0.3), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

#Preview {
    AutomationPage(theme: .constant(.liquidGlass))
        .frame(width: 600, height: 700)
}
