import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldHint,
  Input,
  Label,
  MorzeThemeProvider,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
} from '@morze/ui'

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

/**
 * One frame of the kit for the README. Everything here is a real component
 * except the four overlay surfaces at the right: a dialog, a menu, a popover
 * and a tooltip are portalled and positioned against the viewport when they
 * are live, so the still borrows their panels and lays them out in the grid.
 */
export default function Shot() {
  return (
    <MorzeThemeProvider defaultTheme="dark">
      <div className="shot">
        <div className="shot__col">
          <div className="shot__row">
            <Button>Submit request</Button>
            <Button variant="secondary">Secondary</Button>
          </div>
          <div className="shot__row">
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="shot__row">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="md">MD</Button>
            <Button size="lg">LG</Button>
            <Button size="icon" aria-label="Add">
              <PlusIcon />
            </Button>
          </div>
          <div className="shot__row">
            <Button tone="accent">Accent</Button>
            <Button tone="info">Info</Button>
            <Button tone="warning">Warning</Button>
          </div>
          <div className="shot__row">
            <Button loading>Sending</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
            <Spinner />
          </div>

          <div className="shot__row">
            <Toggle>Bold</Toggle>
            <Toggle pressed>Italic</Toggle>
            <ToggleGroup type="single" defaultValue="b" appearance="joined">
              <ToggleGroupItem value="a">A</ToggleGroupItem>
              <ToggleGroupItem value="b">B</ToggleGroupItem>
              <ToggleGroupItem value="c">C</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="shot__row">
            <ToggleGroup type="single" defaultValue="week" appearance="segmented">
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
              <ToggleGroupItem value="month">Month</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="shot__row">
            <Switch />
            <Switch defaultChecked />
            <Switch tone="accent" defaultChecked />
            <Badge>Solid</Badge>
            <Badge variant="soft" tone="accent">
              Soft
            </Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge tone="danger">Live</Badge>
          </div>

          <Slider defaultValue={[62]} />
          <Slider defaultValue={[24, 78]} tone="accent" />
          <Slider defaultValue={[38]} tone="warning" />

          <div className="shot__row">
            <span className="mz-tooltip-content shot__panel" style={{ width: 'auto' }}>
              Hover and here it is
            </span>
          </div>
          <Progress value={64} />
          <Progress value={38} tone="accent" />
        </div>

        <div className="shot__col">
          <Field>
            <Label htmlFor="shot-name">Name</Label>
            <Input id="shot-name" placeholder="Alexander" />
            <FieldHint>How should we address you</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="shot-email">Email</Label>
            <Input id="shot-email" defaultValue="hi@morze.tech" />
          </Field>
          <Field>
            <Label htmlFor="shot-product">Product</Label>
            <Select defaultValue="erp">
              <SelectTrigger id="shot-product">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="erp">ERP</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="shot-task">Task</Label>
            <Textarea id="shot-task" rows={3} placeholder="Describe the task…" />
          </Field>
          <div className="shot__row">
            <label className="shot__check">
              <Checkbox defaultChecked /> Terms
            </label>
            <label className="shot__check">
              <Checkbox /> Mail
            </label>
            <label className="shot__check">
              <Checkbox tone="accent" defaultChecked /> Accent
            </label>
          </div>
          <RadioGroup defaultValue="pro" className="shot__row">
            <label className="shot__check">
              <RadioGroupItem value="start" /> Start
            </label>
            <label className="shot__check">
              <RadioGroupItem value="pro" /> Pro
            </label>
            <label className="shot__check">
              <RadioGroupItem value="ent" tone="accent" /> Enterprise
            </label>
          </RadioGroup>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scope">Scope</TabsTrigger>
              <TabsTrigger value="price">Price</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Turnkey ERP rollout in 90 days.</TabsContent>
          </Tabs>

          <Tabs defaultValue="line">
            <TabsList variant="line">
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="variant">Variant</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="shot__col">
          <Alert tone="accent">
            <AlertTitle>Request sent</AlertTitle>
            <AlertDescription>A manager will contact you today.</AlertDescription>
          </Alert>
          <Alert tone="danger">
            <AlertTitle>Integration error</AlertTitle>
            <AlertDescription>Check the exchange token.</AlertDescription>
          </Alert>

          <Accordion type="single" defaultValue="rollout" collapsible>
            <AccordionItem value="rollout">
              <AccordionTrigger>How long does a rollout take?</AccordionTrigger>
              <AccordionContent>From 90 days for a standard configuration.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="tenders">
              <AccordionTrigger>Do you work with tenders?</AccordionTrigger>
              <AccordionContent>Yes, including 44-FZ.</AccordionContent>
            </AccordionItem>
          </Accordion>

          <Card interactive>
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardDescription>Lights up on hover, like the buttons.</CardDescription>
              <CardAction>
                <Badge variant="soft">new</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>Gradient fill, hairline rim, inset highlight on top.</CardContent>
            <CardFooter>
              <Button size="sm">Details</Button>
              <Button size="sm" variant="ghost">
                Later
              </Button>
            </CardFooter>
          </Card>

          <div className="shot__row">
            <Avatar>
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback data-tone="accent">MT</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>UI</AvatarFallback>
            </Avatar>
            <Skeleton style={{ height: 10, flex: 1 }} />
          </div>
        </div>

        <div className="shot__col">
          <div className="shot__panel-wrap">
            <div className="mz-panel mz-dialog-content shot__panel">
              <div className="mz-dialog-header">
                <h2 className="mz-dialog-title">Submit a request</h2>
                <p className="mz-dialog-description">We answer within one business day.</p>
              </div>
              <Field>
                <Label htmlFor="shot-phone">Phone</Label>
                <Input id="shot-phone" placeholder="+7 ___ ___-__-__" />
              </Field>
              <div className="mz-dialog-footer">
                <Button variant="ghost">Cancel</Button>
                <Button>Send</Button>
              </div>
            </div>
          </div>

          <div className="mz-panel mz-menu-content shot__panel">
            <div className="mz-menu-label">Account</div>
            <div className="mz-item mz-item--plain">
              Profile
              <span className="mz-menu-shortcut">⌘P</span>
            </div>
            <div className="mz-item mz-item--plain">
              Settings
              <span className="mz-menu-shortcut">⌘,</span>
            </div>
            <div className="mz-menu-separator" />
            <div className="mz-item mz-item--plain mz-item--destructive">Sign out</div>
          </div>

          <div className="mz-panel mz-popover-content shot__panel">
            <div className="mz-popover-header">
              <h2 className="mz-popover-title">Dimensions</h2>
              <p className="mz-popover-description">Set the layout for the block.</p>
            </div>
            <Field>
              <Label htmlFor="shot-width">Width</Label>
              <Input id="shot-width" defaultValue="320px" />
            </Field>
          </div>

        </div>
      </div>
    </MorzeThemeProvider>
  )
}
