import { useState } from 'react'
import { version } from '../../package.json'
import SidebarDemo from './SidebarDemo'
import TableDemo from './TableDemo'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarGroup,
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
  DatePicker,
  DateRangePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useMorzeTheme,
} from '@morze/ui'

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useMorzeTheme()
  return (
    <div className="pg-row">
      <Badge variant="soft" tone="accent">
        {resolvedTheme}
      </Badge>
      <ToggleGroup
        type="single"
        value={resolvedTheme}
        onValueChange={(v) => v && setTheme(v as 'dark' | 'light')}
        size="sm"
      >
        <ToggleGroupItem value="dark">dark</ToggleGroupItem>
        <ToggleGroupItem value="light">light</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="pg-col">{children}</div>
      </CardContent>
    </Card>
  )
}

function Demo() {
  const [progress] = useState(64)

  return (
    <div className="pg">
      <div className="pg__bar">
        <div className="pg__brand">
          <h1>Morze UI</h1>
          <span>@morze/ui {version}</span>
        </div>
        <ThemeSwitch />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <CardTitle>Sidebar</CardTitle>
        </CardHeader>
        <CardContent>
          <SidebarDemo />
        </CardContent>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <CardTitle>DataTable</CardTitle>
        </CardHeader>
        <CardContent>
          <TableDemo />
        </CardContent>
      </Card>

      <div className="pg__grid">
        <Section title="Buttons">
          <div className="pg-row">
            <Button>Submit request</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
          </div>
          <div className="pg-row">
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="pg-row">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="md">MD</Button>
            <Button size="lg">LG</Button>
          </div>
          <div className="pg-row">
            <Button tone="accent">Accent</Button>
            <Button tone="info">Info</Button>
            <Button tone="warning">Warning</Button>
          </div>
          <div className="pg-row">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button size="icon" aria-label="add">
              +
            </Button>
          </div>
        </Section>

        <Section title="Toggles & switches">
          <div className="pg-row">
            <Toggle>Bold</Toggle>
            <Toggle variant="outline" defaultPressed>
              Italic
            </Toggle>
            <Toggle tone="accent" defaultPressed>
              Mono
            </Toggle>
          </div>
          <div className="pg-row">
            <ToggleGroup type="single" defaultValue="week">
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
              <ToggleGroupItem value="month">Month</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="pg-row">
            <ToggleGroup type="multiple" appearance="joined" defaultValue={['b']}>
              <ToggleGroupItem value="a">A</ToggleGroupItem>
              <ToggleGroupItem value="b">B</ToggleGroupItem>
              <ToggleGroupItem value="c">C</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {/* size on the group is the default for every item in it. */}
          <div className="pg-row">
            <ToggleGroup type="single" size="xs" appearance="joined" defaultValue="day">
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" size="sm" defaultValue="day">
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" size="lg" appearance="joined" defaultValue="day">
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="pg-row">
            <Switch defaultChecked />
            <Switch size="sm" />
            <Switch size="lg" defaultChecked tone="accent" />
            <Switch disabled />
          </div>
        </Section>

        <Section title="Checkbox & radio">
          <label className="pg-check">
            <Checkbox defaultChecked /> I agree to the terms
          </label>
          <label className="pg-check">
            <Checkbox /> Subscribe to the newsletter
          </label>
          <label className="pg-check">
            <Checkbox size="lg" defaultChecked tone="accent" /> Large, accent
          </label>
          <label className="pg-check">
            <Checkbox disabled defaultChecked /> Disabled
          </label>
          <Separator />
          <RadioGroup defaultValue="pro">
            <label className="pg-check">
              <RadioGroupItem value="start" /> Start
            </label>
            <label className="pg-check">
              <RadioGroupItem value="pro" /> Pro
            </label>
            <label className="pg-check">
              <RadioGroupItem value="ent" tone="accent" /> Enterprise
            </label>
          </RadioGroup>
        </Section>

        <Section title="Fields">
          <Field>
            <Label htmlFor="pg-name">Name</Label>
            <Input id="pg-name" placeholder="Alexander" />
            <FieldHint>How should we address you</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="pg-mail">Email</Label>
            <Input id="pg-mail" type="email" defaultValue="hi@morze.tech" />
          </Field>
          <Field>
            <Label>Product</Label>
            <Select defaultValue="erp">
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Products</SelectLabel>
                  <SelectItem value="erp">ERP</SelectItem>
                  <SelectItem value="crm">CRM</SelectItem>
                  <SelectItem value="ai">AI hub</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <Label>Delivery window</Label>
            <DateRangePicker
              locale="en-GB"
              presets={[
                { label: 'This week', range: { from: new Date(2026, 8, 7), to: new Date(2026, 8, 13) } },
                { label: 'This month', range: { from: new Date(2026, 8, 1), to: new Date(2026, 8, 30) } },
              ]}
            />
          </Field>
          <Field>
            <Label>Signed on</Label>
            <DatePicker locale="en-GB" defaultValue={new Date(2026, 8, 12)} size="sm" />
          </Field>
          <Field>
            <Label htmlFor="pg-msg">Task</Label>
            <Textarea id="pg-msg" placeholder="Describe the task…" />
          </Field>
        </Section>

        <Section title="Slider & progress">
          <Slider defaultValue={[42]} />
          <Slider defaultValue={[20, 70]} tone="accent" />
          <Progress value={progress} />
          <Progress value={30} tone="warning" />
          <Progress indeterminate tone="info" />
          <div className="pg-row">
            <Skeleton style={{ width: 120, height: 12 }} />
            <Skeleton style={{ width: 64, height: 12 }} />
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Scope</TabsTrigger>
              <TabsTrigger value="price">Price</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Turnkey ERP rollout in 90 days.</TabsContent>
            <TabsContent value="specs">Integrations, migration, training.</TabsContent>
            <TabsContent value="price">From $15,000.</TabsContent>
          </Tabs>
          <Tabs defaultValue="a">
            <TabsList variant="line">
              <TabsTrigger value="a">Line</TabsTrigger>
              <TabsTrigger value="b">Variant</TabsTrigger>
            </TabsList>
            <TabsContent value="a">The underlined tab list variant.</TabsContent>
            <TabsContent value="b">Second tab.</TabsContent>
          </Tabs>
        </Section>

        <Section title="Overlays">
          <div className="pg-row">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit a request</DialogTitle>
                  <DialogDescription>We answer within one business day.</DialogDescription>
                </DialogHeader>
                <Field>
                  <Label htmlFor="d-phone">Phone</Label>
                  <Input id="d-phone" placeholder="+7 ___ ___-__-__" />
                </Field>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button>Send</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem>
                  Profile <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>Hover and here it is</TooltipContent>
            </Tooltip>
          </div>

          <Alert tone="accent">
            <AlertTitle>Request sent</AlertTitle>
            <AlertDescription>A manager will contact you today.</AlertDescription>
          </Alert>
          <Alert tone="danger">
            <AlertTitle>Integration error</AlertTitle>
            <AlertDescription>Check the exchange token.</AlertDescription>
          </Alert>
        </Section>

        <Section title="Badges, avatar, accordion">
          <div className="pg-row">
            <Badge>Solid</Badge>
            <Badge variant="soft" tone="accent">
              Soft
            </Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge tone="danger">
              Live
            </Badge>
          </div>
          <div className="pg-row">
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>AS</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback data-tone="accent">MT</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback data-tone="info">KV</AvatarFallback>
              </Avatar>
            </AvatarGroup>
            <Avatar size="sm">
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>UI</AvatarFallback>
            </Avatar>
          </div>
          <AvatarGroup max={3}>
            <Avatar><AvatarFallback>AS</AvatarFallback></Avatar>
            <Avatar><AvatarFallback data-tone="accent">MT</AvatarFallback></Avatar>
            <Avatar><AvatarFallback data-tone="info">KV</AvatarFallback></Avatar>
            <Avatar><AvatarFallback data-tone="warning">DP</AvatarFallback></Avatar>
            <Avatar><AvatarFallback data-tone="danger">SK</AvatarFallback></Avatar>
          </AvatarGroup>
          <Accordion type="single" collapsible defaultValue="q1">
            <AccordionItem value="q1">
              <AccordionTrigger>How long does a rollout take?</AccordionTrigger>
              <AccordionContent>From 90 days for a standard configuration.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Do you work with public tenders?</AccordionTrigger>
              <AccordionContent>Yes, we have public contract experience.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        <Section title="Table (hand-laid)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead sortable sorted="asc" sortLabel="Sort by Item">
                  Item
                </TableHead>
                <TableHead sortable sortLabel="Sort by Qty">Qty</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Controller unit</TableCell>
                <TableCell>12</TableCell>
                <TableCell>In stock</TableCell>
              </TableRow>
              <TableRow data-state="selected">
                <TableCell>Sensor array</TableCell>
                <TableCell>4</TableCell>
                <TableCell>On order</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Mounting kit</TableCell>
                <TableCell>30</TableCell>
                <TableCell>In stock</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

        <Card interactive>
          <CardHeader>
            <CardTitle>Interactive card</CardTitle>
            <CardDescription>Lights up on hover, like the buttons.</CardDescription>
            <CardAction>
              <Badge variant="soft">new</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            The same convex language: gradient fill, hairline rim, inset highlight on top.
          </CardContent>
          <CardFooter>
            <Button size="sm">Details</Button>
            <Button size="sm" variant="ghost">
              Later
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <MorzeThemeProvider defaultTheme="dark">
      <Demo />
    </MorzeThemeProvider>
  )
}
