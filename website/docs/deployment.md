---
outline: deep
---

# UML Deployment Diagram

To create a UML deployment diagram, use the `deploymentDiagram` function:

```hyl
deploymentDiagram {
    // define elements
}
```

A deployment diagram is built from the same classifiers as a [component diagram](./component.md) - it
adds the deployment targets a system runs on, the artifacts that are deployed onto them, and the two
stereotyped dependencies which connect the two.
All elements described below are also available in the [general UML diagram](./uml.md).

## Type level and instance level

Every deployment target and every artifact can be written either as a type or as an instance
specification, which is the form most deployment diagrams are drawn in.
Naming a type as the second argument is what makes the difference: the title then becomes
`name:Type` and is underlined, exactly like an [instance](./class.md#instance).

```hylimo
deploymentDiagram {
    node("ApplicationServer")

    node("appServer", "ApplicationServer") layout {
        pos = apos(0, 250)
    }
}
```

Both forms register the element in the diagram scope under its first argument, so the examples above
are reachable as `ApplicationServer` and `appServer` respectively.

## Elements

### `node`

Creates a node, a computational resource, rendered as a 3D box.
The title, the compartments and the nesting all behave like those of a [class](./class.md#class):

```hylimo
deploymentDiagram {
    node("ApplicationServer") {
        public {
            cpuCount : int
            memory : int
        }
    }
}
```

#### Nesting

Nesting is not decoration but notation: an artifact nested in a node **is** a deployment, and an
execution environment nested in a device **is** the statement that it runs on that device.

```hylimo
deploymentDiagram {
    node("appServer", "ApplicationServer") {
        artifact("shop.war")
    }
}
```

Nodes can equally contain components, classes and further nodes.

#### Ports, provided and required interfaces

A node is a classifier like any other, so it supports `port`, `provides` and `requires`.
For details, see [UML Component Diagram](./component.md#ports).

```hylimo
deploymentDiagram {
    node("Server") {
        provides("REST")
        port(0.25).requires("SMTP", 0.25)
    }
}
```

### `device`

Creates a device, a node which is a physical computational resource.
It is a node carrying the `«device»` keyword:

```hylimo
deploymentDiagram {
    device("dbHost", "DatabaseHost")
}
```

### `executionEnvironment`

Creates an execution environment, a node which is the software container artifacts are deployed in.
It is a node carrying the `«executionEnvironment»` keyword:

```hylimo
deploymentDiagram {
    device("appHost", "ApplicationHost") {
        executionEnvironment("JVM") {
            artifact("shop.war")
        }
    }
}
```

### `artifact`

Creates an artifact, a physical piece of information such as a file.
UML marks an artifact with the `«artifact»` keyword, with the icon in its upper right corner, or with
both; each of the two can be turned off on its own, see [config properties](#config-properties).

```hylimo
deploymentDiagram {
    artifact("shop.war")

    artifact("config", "PropertyFile") layout {
        pos = apos(0, 250)
    }
}
```

Artifacts support compartments just like the other classifiers, which is how the elements they
contain are listed:

```hylimo
deploymentDiagram {
    artifact("shop.war") {
        section(
            "shop.jar",
            "web.xml"
        )
    }
}
```

### `deploymentSpec`

Creates a deployment specification, the parameters an artifact is deployed and executed with.
It carries the `«deployment spec»` keyword, and its parameters are the regular
[value specifications](./class.md#instance) of a classifier:

```hylimo
deploymentDiagram {
    deploymentSpec("shopDeployment") {
        values {
            deploymentLocation = "/opt/shop"
            executionLocation = "/opt/shop/bin"
        }
    }
}
```

### Further elements

`component`, `instance`, `package` and `comment` are available as well, and behave exactly as in the
[component diagram](./component.md).

## Connections

### Communication path

A communication path between two deployment targets is a plain association, so the `--` operator
already is one. The protocol is written on it as an ordinary label, wrapped in guillemets by the
`keyword` function:

```hylimo
deploymentDiagram {
    device("appHost", "ApplicationHost")

    device("dbHost", "DatabaseHost") layout {
        pos = apos(600, 0)
    }

    appHost -- dbHost with {
        label(keyword("JDBC"), 0.5, -25)
    }
}
```

### Deployment and manifestation

Deploying an artifact onto a target and manifesting a model element by an artifact are both plain
dependencies, distinguished from any other dependency only by their keyword.
They are therefore written with the dashed arrow `..>` and a `«deploy»` respectively `«manifest»`
label:

```hylimo
deploymentDiagram {
    artifact("shop.war")

    node("appServer", "ApplicationServer") layout {
        pos = apos(0, 400)
    }

    component("Shop") layout {
        pos = apos(600, 400)
    }

    `shop.war` ..> appServer with {
        over = start(Position.Bottom).line(end(Position.Top))
        label(keyword("deploy"), 0.5, -25)
    }

    `shop.war` ..> Shop with {
        over = start(Position.BottomRight).line(end(Position.TopLeft))
        label(keyword("manifest"), 0.5, -25)
    }
}
```

Nesting the artifact inside the target is the other notation for a deployment, see
[nesting](#nesting).

### Further connections

`dependsOn` connects a required to a provided interface, see
[UML Component Diagram](./component.md#dependson).
For additional connection types (associations, aggregations, etc.), refer to the
[class diagram documentation](class.md).

## Config properties

The following config properties are available for deployment diagrams:

| Variable                          | Meaning                                                             | Default value (in pixels) | Comment |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------- | ------- |
| `abstractAsProperty`              | Whether to show { abstract } after the name of abstract classifiers | false                     | -       |
| `providesDistance`                | Default distance of provided interfaces to the classifier outline   | 100                       | -       |
| `requiresDistance`                | Default distance of required interfaces to the classifier outline   | 100                       | -       |
| `showArtifactIcon`                | Whether to show the artifact symbol                                 | true                      | -       |
| `showArtifactKeyword`             | Whether to show the artifact keyword                                | true                      | -       |
| `showComponentKeyword`            | Whether to show the component keyword                               | true                      | -       |
| `showComponentSymbol`             | Whether to show the component symbol                                | true                      | -       |
| `showDeviceKeyword`               | Whether to show the device keyword                                  | true                      | -       |
| `showExecutionEnvironmentKeyword` | Whether to show the executionEnvironment keyword                    | true                      | -       |

## Styling

The following [style variables](./diagram.md#style-variables) are used by the deployment diagram
elements:

| Variable                | Meaning                                        | Default value (in pixels) |
| ----------------------- | ---------------------------------------------- | ------------------------- |
| `artifactIconSize`      | Width of the artifact symbol in the title      | 20                        |
| `componentIconSize`     | Size of the component symbol in the title      | 25                        |
| `providedInterfaceSize` | Diameter of the circle of a provided interface | 30                        |
| `requiredInterfaceSize` | Size of the socket of a required interface     | 45                        |

## Example

The following example shows the deployment of a small shop, using most of the elements described
above:

<DiagramExample id="deployment" />
