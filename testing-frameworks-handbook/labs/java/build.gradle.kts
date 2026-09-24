import org.gradle.process.CommandLineArgumentProvider

plugins {
    java
    id("info.solidsoft.pitest") version "1.19.0"
}

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencyLocking {
    lockAllConfigurations()
}

val mockitoAgent by configurations.creating

dependencies {
    testImplementation(platform("org.junit:junit-bom:6.1.1"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.mockito:mockito-junit-jupiter:5.23.0")
    testImplementation("com.google.truth:truth:1.4.5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    mockitoAgent("org.mockito:mockito-core:5.23.0") {
        isTransitive = false
    }
}

val verifyNoVintageEngine by tasks.registering {
    val testRuntimeClasspath = configurations.named("testRuntimeClasspath")
    inputs.files(testRuntimeClasspath)
    doLast {
        val modules = testRuntimeClasspath.get().resolvedConfiguration.resolvedArtifacts
            .map { "${it.moduleVersion.id.group}:${it.name}:${it.moduleVersion.id.version}" }
            .sorted()
        check(modules.any { it.startsWith("org.junit.jupiter:junit-jupiter-engine:6.1.1") }) {
            "JUnit Jupiter engine 6.1.1 is missing from the runtime classpath"
        }
        check(modules.none { it.startsWith("org.junit.vintage:junit-vintage-engine:") }) {
            "JUnit Vintage must not be used for new tests"
        }
        println("JUnit engine gate: Jupiter 6.1.1 present, Vintage absent")
    }
}

tasks.test {
    dependsOn(verifyNoVintageEngine)
    useJUnitPlatform()
    if (providers.gradleProperty("mockitoAgent").orNull != "off") {
        jvmArgumentProviders.add(
            CommandLineArgumentProvider {
                listOf("-javaagent:${mockitoAgent.singleFile.absolutePath}")
            }
        )
    }
    providers.gradleProperty("testJavaHome").orNull?.let { javaHome ->
        executable = file("$javaHome/bin/java").absolutePath
    }
    testLogging {
        events("passed", "skipped", "failed")
    }
}

// Risk-based mutation lane (Issue #22): PIT mutates only production classes in
// the checkout package; labs/mutation/scripts/gate-pit.mjs turns every
// surviving mutant into a gate failure unless it has a reviewed decision.
pitest {
    pitestVersion = "1.30.0"
    junit5PluginVersion = "1.2.3"
    targetClasses = setOf("handbook.checkout.*")
    threads = 2
    outputFormats = setOf("XML", "HTML")
    timestampedReports = false
    jvmArgs.add(provider { "-javaagent:${mockitoAgent.singleFile.absolutePath}" })
}
